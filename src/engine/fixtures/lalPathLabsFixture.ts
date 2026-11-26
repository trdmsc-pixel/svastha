import {
  HealthPlan,
  LabReportRecord,
  RawExtractedTest,
  ReportSummaryPayload,
  SupplementOption,
} from '@/types/domain';
import { detectCrossMarkerPatterns, normalizeReportTests } from '../biomarkerEngine';
import { evaluateRedFlags } from '../redFlags';
import { calculateRetestSchedule } from '../retestCalculator';
import { filterSafeSupplements } from '../safetyGuard';

/**
 * Section 14 Test Fixture: Anonymised Dr Lal PathLabs 5-page report (Male, 32 y).
 * Contains all 18 test values; excludes the lipid treatment-goal guidance table & barcode noise.
 */
export const LAL_PATHLABS_RAW_TESTS: RawExtractedTest[] = [
  { panel_name: 'LIVER PANEL 1; LFT, SERUM', raw_name: 'AST (SGOT)', value: 57.6, value_text: '57.6', unit: 'U/L', ref_raw: '<50', lab_flag: 'H', confidence: 0.99 },
  { panel_name: 'LIVER PANEL 1; LFT, SERUM', raw_name: 'ALT (SGPT)', value: 99.8, value_text: '99.8', unit: 'U/L', ref_raw: '<50', lab_flag: 'H', confidence: 0.99 },
  { panel_name: 'LIVER PANEL 1; LFT, SERUM', raw_name: 'AST:ALT ratio', value: 0.58, value_text: '0.58', unit: 'ratio', ref_raw: '<1.00', lab_flag: null, confidence: 0.98 },
  { panel_name: 'LIVER PANEL 1; LFT, SERUM', raw_name: 'GGTP', value: 28.5, value_text: '28.5', unit: 'U/L', ref_raw: '<55', lab_flag: null, confidence: 0.99 },
  { panel_name: 'LIVER PANEL 1; LFT, SERUM', raw_name: 'ALP', value: 87.9, value_text: '87.90', unit: 'U/L', ref_raw: '30-120', lab_flag: null, confidence: 0.99 },
  { panel_name: 'LIVER PANEL 1; LFT, SERUM', raw_name: 'Bilirubin total', value: 0.52, value_text: '0.52', unit: 'mg/dL', ref_raw: '0.30-1.20', lab_flag: null, confidence: 0.99 },
  { panel_name: 'LIVER PANEL 1; LFT, SERUM', raw_name: 'Bilirubin direct', value: 0.14, value_text: '0.14', unit: 'mg/dL', ref_raw: '<0.20', lab_flag: null, confidence: 0.99 },
  { panel_name: 'LIVER PANEL 1; LFT, SERUM', raw_name: 'Bilirubin indirect', value: 0.38, value_text: '0.38', unit: 'mg/dL', ref_raw: '<1.10', lab_flag: null, confidence: 0.99 },
  { panel_name: 'LIVER PANEL 1; LFT, SERUM', raw_name: 'Total protein', value: 7.7, value_text: '7.70', unit: 'g/dL', ref_raw: '6.40-8.30', lab_flag: null, confidence: 0.99 },
  { panel_name: 'LIVER PANEL 1; LFT, SERUM', raw_name: 'Albumin', value: 4.47, value_text: '4.47', unit: 'g/dL', ref_raw: '3.50-5.20', lab_flag: null, confidence: 0.99 },
  { panel_name: 'LIVER PANEL 1; LFT, SERUM', raw_name: 'Globulin', value: 3.23, value_text: '3.23', unit: 'g/dL', ref_raw: '2.00-3.50', lab_flag: null, confidence: 0.98 },
  { panel_name: 'LIVER PANEL 1; LFT, SERUM', raw_name: 'A:G Ratio', value: 1.38, value_text: '1.38', unit: 'ratio', ref_raw: '0.90-2.00', lab_flag: null, confidence: 0.98 },
  { panel_name: 'GLUCOSE, FASTING', raw_name: 'Fasting plasma glucose', value: 83.6, value_text: '83.60', unit: 'mg/dL', ref_raw: '70-100', lab_flag: null, confidence: 0.99 },
  { panel_name: 'LIPID PROFILE', raw_name: 'Total cholesterol', value: 160.8, value_text: '160.80', unit: 'mg/dL', ref_raw: '<200', lab_flag: null, confidence: 0.99 },
  { panel_name: 'LIPID PROFILE', raw_name: 'Triglycerides', value: 124.0, value_text: '124.00', unit: 'mg/dL', ref_raw: '<150', lab_flag: null, confidence: 0.99 },
  { panel_name: 'LIPID PROFILE', raw_name: 'HDL', value: 29.1, value_text: '29.10', unit: 'mg/dL', ref_raw: '>40', lab_flag: 'L', confidence: 0.99 },
  { panel_name: 'LIPID PROFILE', raw_name: 'LDL (calc.)', value: 106.9, value_text: '106.90', unit: 'mg/dL', ref_raw: '<100', lab_flag: 'H', confidence: 0.99 },
  { panel_name: 'LIPID PROFILE', raw_name: 'VLDL', value: 24.8, value_text: '24.80', unit: 'mg/dL', ref_raw: '<30', lab_flag: null, confidence: 0.99 },
  { panel_name: 'LIPID PROFILE', raw_name: 'Non-HDL', value: 132, value_text: '132', unit: 'mg/dL', ref_raw: '<130', lab_flag: 'H', confidence: 0.99 },
];

export const LAL_PATHLABS_LAB_NOTES: string[] = [
  'Lipid Association of India (LAI) suggests >= 3 months of non-drug lifestyle approach for low-risk profiles before considering medication.',
  'Consider additional risk markers such as Apo B, hsCRP, and Lp(a) in consultation with your physician.',
  'Mildly raised transaminases in asymptomatic adults are most commonly associated with fatty liver; clinical correlation and ultrasound may be considered.',
];

export function buildSampleReportRecord(startDate = new Date('2026-11-26')): LabReportRecord {
  const values = normalizeReportTests(LAL_PATHLABS_RAW_TESTS);
  const redFlags = evaluateRedFlags(values);
  const patterns = detectCrossMarkerPatterns(values);

  const riskMarkers = values.filter((v) => v.status === 'high' || v.status === 'low');
  const watchMarkers = values.filter((v) => v.status === 'borderline_high' || v.status === 'borderline_low');
  const okMarkers = values.filter((v) => v.status === 'normal');

  const liverFlagged = values.filter((v) => v.system === 'Liver' && v.status !== 'normal');
  const lipidFlagged = values.filter((v) => v.system === 'Heart & lipids' && v.status !== 'normal');

  const summary: ReportSummaryPayload = {
    snapshot_sentence:
      'Your fasting glucose and most liver markers are in range, while ALT/AST and HDL/LDL need focused lifestyle habits and a check-in with your doctor.',
    counts: {
      risk: riskMarkers.length,
      watch: watchMarkers.length,
      ok: okMarkers.length,
    },
    red_flags: redFlags,
    risk_groups: [
      {
        system: 'Liver',
        markers: liverFlagged,
        explanation:
          'ALT (99.8 U/L, 2.0× upper limit) and AST (57.6 U/L, 1.15× upper limit) are above the lab reference of <50 U/L. This pattern may suggest mild liver stress, often linked to lifestyle or fatty liver.',
        what_helps: [
          'Gradual, sustainable weight and waist reduction (5–7% over 12 weeks if applicable).',
          'Cut back on sugary drinks, refined snacks, and alcohol.',
          'Aim for 150 minutes/week of brisk walking plus 2 strength sessions.',
        ],
        why_rule: 'Computed from lab reference <50 U/L: ALT 99.8 = High (2.0× ULN), AST 57.6 = High (1.15× ULN).',
      },
      {
        system: 'Heart & lipids',
        markers: lipidFlagged,
        explanation:
          'HDL (29.1 mg/dL) is below the >40 mg/dL target, while LDL (106.9 mg/dL) and Non-HDL (132 mg/dL) are just above target. Raising fibre and daily movement usually helps nudge these in the right direction.',
        what_helps: [
          'Add soluble fibre daily (oats, dal, sprouts, flaxseed, vegetables).',
          'Swap refined oils/fried snacks for measured nuts and healthy fats.',
          'Regular aerobic exercise is one of the best ways to raise HDL.',
        ],
        why_rule: 'Computed from lab ranges: HDL <40 = Low, LDL 106.9 vs <100 = Borderline High, Non-HDL 132 vs <130 = Borderline High.',
      },
    ],
    ok_markers: okMarkers,
    patterns,
    top_actions: [
      { title: 'Walk briskly 30 min, 5 days a week', why: 'Supports lowering ALT and raising HDL', plan_area: 'Exercise' },
      { title: 'Hit 35 g daily fibre with dal, oats, and salads', why: 'Helps lower LDL and Non-HDL', plan_area: 'Meals' },
      { title: 'Avoid alcohol and sugary beverages for 12 weeks', why: 'Reduces direct liver enzyme load', plan_area: 'Measures' },
      { title: 'Prioritise 7.5 hours of consistent sleep', why: 'Supports metabolic recovery', plan_area: 'Sleep' },
      { title: 'Review follow-up tests with your doctor', why: 'Confirm whether ultrasound or Apo B/hsCRP/Lp(a) are needed', plan_area: 'Medicines' },
    ],
    doctor_points: [
      'LDL (106.9 mg/dL) is slightly above target. Per the lab note (LAI guidance), ask your doctor whether a >= 3 months non-drug lifestyle approach first fits your risk level.',
      'Ask whether a liver ultrasound is appropriate given ALT 99.8 U/L and AST 57.6 U/L alongside low HDL.',
      'Discuss whether checking Apo B, hsCRP, or Lp(a) would add helpful context.',
    ],
    followup_tests_from_lab_notes: ['Apo B', 'hsCRP', 'Lp(a)', 'Liver ultrasound (for your doctor to decide)'],
  };

  return {
    id: 'sample-lal-pathlabs-001',
    lab_name: 'Dr Lal PathLabs (SAMPLE)',
    collected_at: startDate.toISOString(),
    reported_at: startDate.toISOString(),
    source_type: 'sample',
    is_sample: true,
    values,
    lab_notes: LAL_PATHLABS_LAB_NOTES,
    summary,
  };
}

export function buildSamplePlanFromReport(report: LabReportRecord, startDate = new Date('2026-11-26')): HealthPlan {
  const retest = calculateRetestSchedule(report.values, startDate);

  const candidateSupplements: SupplementOption[] = [
    {
      name: 'Omega-3 (EPA/DHA)',
      why_biomarker: 'HDL (29.1 mg/dL) & lipid profile',
      evidence: 'Moderate',
      typical_form: 'Triglyceride-form fish oil or algae oil',
      caution: 'Check with your doctor first, especially if taking blood thinners.',
    },
    {
      name: 'High-dose Niacin',
      why_biomarker: 'HDL',
      evidence: 'Limited',
      typical_form: 'Nicotinic acid',
      hepatotoxic_risk: true,
    },
    {
      name: 'Green-tea extract (EGCG)',
      why_biomarker: 'Metabolic support',
      evidence: 'Limited',
      typical_form: 'Concentrated capsule',
      hepatotoxic_risk: true,
    },
    {
      name: 'Psyllium husk (Isabgol)',
      why_biomarker: 'LDL (106.9 mg/dL) & Non-HDL (132 mg/dL)',
      evidence: 'Strong',
      typical_form: 'Plain unflavoured husk with water',
      caution: 'Take separately from prescribed medicines; confirm with your doctor.',
    },
  ];

  // Deterministic safety filter removes Niacin and Green-tea extract because ALT/AST are flagged
  const safeSupplements = filterSafeSupplements(candidateSupplements, report.values, false);

  return {
    id: 'plan-sample-001',
    report_id: report.id,
    status: 'active',
    start_date: startDate.toISOString().slice(0, 10),
    retest_date: retest.retestDateIso,
    retest_weeks: retest.weeks,
    retest_reasoning: retest.reasoning,
    targets: [
      { marker: 'ALT (SGPT)', biomarker_code: 'ALT', current: 99.8, target: '< 50', unit: 'U/L' },
      { marker: 'AST (SGOT)', biomarker_code: 'AST', current: 57.6, target: '< 50', unit: 'U/L' },
      { marker: 'HDL Cholesterol', biomarker_code: 'HDL', current: 29.1, target: '> 40', unit: 'mg/dL' },
      { marker: 'LDL Cholesterol', biomarker_code: 'LDL', current: 106.9, target: '< 100', unit: 'mg/dL' },
      { marker: 'Non-HDL Cholesterol', biomarker_code: 'NON_HDL', current: 132, target: '< 130', unit: 'mg/dL' },
    ],
    daily_targets: {
      kcal: 2000,
      protein_g: 125,
      carbs_g: 240,
      fat_g: 60,
      fibre_g: 35,
      water_ml: 2750,
      steps: 8000,
    },
    supplements_to_discuss: safeSupplements,
    medication_talking_points: report.summary?.doctor_points ?? [],
    sleep: {
      bed: '22:45',
      wake: '06:30',
      caffeine_cutoff: '14:00',
      wind_down: ['Dim screens 45 min before bed', 'Light stretching or reading', 'Keep bedroom cool and dark'],
    },
    exercise_weekly: [
      { day: 'Mon', type: 'Brisk Walk', minutes: 35, intensity: 'Moderate (talk test)', steps: ['5 min warm-up', '25 min brisk pace', '5 min cool-down'] },
      { day: 'Tue', type: 'Full-Body Strength', minutes: 30, intensity: 'Moderate', steps: ['Bodyweight squats 3×12', 'Incline push-ups 3×10', 'Plank 3×30s'] },
      { day: 'Wed', type: 'Brisk Walk', minutes: 35, intensity: 'Moderate', steps: ['Steady outdoor walk', 'Focus on posture and breathing'] },
      { day: 'Thu', type: 'Mobility & Core', minutes: 25, intensity: 'Light-Moderate', steps: ['Cat-cow', 'Glute bridges 3×15', 'Bird-dog 3×10'] },
      { day: 'Fri', type: 'Brisk Walk', minutes: 35, intensity: 'Moderate', steps: ['35 min steady cardio'] },
      { day: 'Sat', type: 'Strength + Walk', minutes: 40, intensity: 'Moderate', steps: ['Resistance band rows', 'Lunges 3×10', '20 min walk'] },
      { day: 'Sun', type: 'Active Recovery', minutes: 20, intensity: 'Light', steps: ['Easy stroll and stretching'] },
    ],
    measures: [
      'Avoid alcohol completely for the 12-week liver recovery cycle.',
      'Limit added sugar and fried packaged snacks.',
      'Get 15 minutes of morning sunlight daily.',
    ],
    adherence_pct: 72,
  };
}

/**
 * Synthetic 12-week follow-up report for Phase 5 comparison testing.
 */
export const SYNTHETIC_FOLLOWUP_RAW_TESTS: RawExtractedTest[] = LAL_PATHLABS_RAW_TESTS.map((t) => {
  if (t.raw_name === 'ALT (SGPT)') return { ...t, value: 44.2, value_text: '44.2', lab_flag: null };
  if (t.raw_name === 'AST (SGOT)') return { ...t, value: 38.0, value_text: '38.0', lab_flag: null };
  if (t.raw_name === 'HDL') return { ...t, value: 43.5, value_text: '43.5', lab_flag: null };
  if (t.raw_name === 'LDL (calc.)') return { ...t, value: 94.0, value_text: '94.0', lab_flag: null };
  if (t.raw_name === 'Non-HDL') return { ...t, value: 121, value_text: '121', lab_flag: null };
  return t;
});
