import {
  ActivityLevel,
  HealthBackground,
  HealthPlan,
  LabReportRecord,
  NormalizedBiomarkerValue,
  PlanTarget,
  PlanTask,
  RecipeFocus,
  SupplementOption,
  UserProfile,
} from '@/types/domain';
import { ageFromDob, hhmmToMinutes, minutesToHHmm } from '@/lib/dates';
import { calculateDailyNutritionTargets, calculateDailyWaterMl } from './nutritionEngine';
import { calculateRetestSchedule } from './retestCalculator';
import { filterSafeSupplements, hasFlaggedLiverEnzymes } from './safetyGuard';

/** Maps a flagged biomarker to the nutrition/lifestyle focus areas that can support it. */
export function focusAreasFor(values: NormalizedBiomarkerValue[]): RecipeFocus[] {
  const set = new Set<RecipeFocus>();
  for (const v of values) {
    if (v.status === 'normal') continue;
    const high = v.status === 'high' || v.status === 'borderline_high';
    const low = v.status === 'low' || v.status === 'borderline_low';
    switch (v.biomarker_code) {
      case 'ALT':
      case 'AST':
      case 'GGTP':
      case 'ALP':
      case 'BILIRUBIN_TOTAL':
        if (high) set.add('liver');
        break;
      case 'HDL':
        if (low) set.add('hdl');
        break;
      case 'LDL':
      case 'NON_HDL':
      case 'CHOLESTEROL_TOTAL':
      case 'VLDL':
        if (high) set.add('ldl');
        break;
      case 'TRIGLYCERIDES':
        if (high) set.add('triglycerides');
        break;
      case 'GLUCOSE_FASTING':
      case 'HBA1C':
        if (high) set.add('glucose');
        break;
      case 'HAEMOGLOBIN':
      case 'FERRITIN':
        if (low) set.add('iron');
        break;
      case 'VITAMIN_B12':
        if (low) set.add('b12');
        break;
      case 'VITAMIN_D':
        if (low) set.add('vitamin_d');
        break;
      case 'TSH':
        set.add('thyroid');
        break;
      case 'CREATININE':
      case 'POTASSIUM':
        set.add('kidney');
        break;
      case 'URIC_ACID':
        if (high) set.add('uric_acid');
        break;
      default:
        break;
    }
  }
  return [...set];
}

export function goalFromProfile(goals: string[]): 'lose_weight' | 'maintain' | 'gain_muscle' {
  const g = goals.map((x) => x.toLowerCase()).join(' ');
  if (/lose|weight loss|fat/.test(g)) return 'lose_weight';
  if (/muscle|gain|strength/.test(g)) return 'gain_muscle';
  return 'maintain';
}

function targetString(v: NormalizedBiomarkerValue): string {
  if (v.ref_operator === '<' || v.ref_operator === '<=') return `< ${v.ref_high}`;
  if (v.ref_operator === '>' || v.ref_operator === '>=') return `> ${v.ref_low}`;
  if (v.ref_low !== null && v.ref_high !== null) return `${v.ref_low}–${v.ref_high}`;
  return v.ref_raw || 'In range';
}

const SUPPLEMENT_LIBRARY: Array<SupplementOption & { focus: RecipeFocus[] }> = [
  { name: 'Omega-3 (EPA/DHA)', why_biomarker: 'Triglycerides & HDL', evidence: 'Moderate', typical_form: 'Fish oil or algae oil', caution: 'Check with your doctor first, especially if you take blood thinners.', focus: ['triglycerides', 'hdl'] },
  { name: 'Psyllium husk (Isabgol)', why_biomarker: 'LDL & non-HDL cholesterol', evidence: 'Strong', typical_form: 'Plain unflavoured husk with water', caution: 'Take apart from prescribed medicines; confirm with your doctor.', focus: ['ldl', 'glucose'] },
  { name: 'Vitamin D3', why_biomarker: 'Low vitamin D', evidence: 'Strong', typical_form: 'Cholecalciferol (dose per your doctor)', caution: 'Dose depends on your level — your doctor decides.', focus: ['vitamin_d'] },
  { name: 'Vitamin B12', why_biomarker: 'Low B12', evidence: 'Strong', typical_form: 'Methylcobalamin or cyanocobalamin', caution: 'Ask your doctor about the right form and dose.', focus: ['b12'] },
  { name: 'Iron (with vitamin C)', why_biomarker: 'Low haemoglobin / ferritin', evidence: 'Strong', typical_form: 'Ferrous salt or bisglycinate', caution: 'Only after your doctor confirms iron deficiency.', focus: ['iron'] },
  { name: 'High-dose Niacin', why_biomarker: 'HDL', evidence: 'Limited', typical_form: 'Nicotinic acid', hepatotoxic_risk: true, focus: ['hdl'] },
  { name: 'Green-tea extract (EGCG)', why_biomarker: 'Metabolic support', evidence: 'Limited', typical_form: 'Concentrated capsule', hepatotoxic_risk: true, focus: ['weight', 'liver'] },
];

const EXERCISE_BY_ACTIVITY: Record<ActivityLevel, { walk: number; strength: number; steps: number }> = {
  sedentary: { walk: 25, strength: 20, steps: 6500 },
  light: { walk: 30, strength: 25, steps: 7500 },
  moderate: { walk: 35, strength: 30, steps: 8500 },
  active: { walk: 40, strength: 40, steps: 10000 },
  very_active: { walk: 45, strength: 45, steps: 11000 },
};

export interface BuildPlanInput {
  report: LabReportRecord;
  profile: UserProfile;
  healthBackground: HealthBackground;
  startDate?: Date;
}

/** Deterministic personalised plan from a report + profile (no LLM). */
export function buildPersonalPlan({ report, profile, healthBackground, startDate = new Date() }: BuildPlanInput): {
  plan: HealthPlan;
  tasks: PlanTask[];
} {
  const values = report.values;
  const flagged = values.filter((v) => v.status !== 'normal');
  const focus = focusAreasFor(values);
  const retest = calculateRetestSchedule(values, startDate);
  const age = ageFromDob(profile.dob) ?? 30;
  const pregnant = !!healthBackground.pregnant;

  const nutrition = calculateDailyNutritionTargets({
    sex: profile.sex,
    ageYears: age,
    heightCm: profile.height_cm,
    weightKg: profile.weight_kg,
    activityLevel: profile.activity_level,
    goal: goalFromProfile(profile.goals),
    pregnant,
    underMedicalSupervision: healthBackground.under_medical_supervision,
  });
  const ex = EXERCISE_BY_ACTIVITY[profile.activity_level];
  const kidney = focus.includes('kidney');

  const targets: PlanTarget[] = flagged
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 6)
    .map((v) => ({ marker: v.display_name, biomarker_code: v.biomarker_code, current: v.value, target: targetString(v), unit: v.unit }));

  const candidates = SUPPLEMENT_LIBRARY.filter((s) => s.focus.some((f) => focus.includes(f))).map(({ focus: _f, ...s }) => s);
  const supplements = filterSafeSupplements(candidates, values, pregnant);

  const bedMin = hhmmToMinutes(profile.sleep_time);
  const wakeMin = hhmmToMinutes(profile.wake_time);
  const measures: string[] = [];
  if (hasFlaggedLiverEnzymes(values)) measures.push('Avoid alcohol completely until your retest — it puts direct load on the liver.');
  if (focus.includes('glucose') || focus.includes('triglycerides')) measures.push('Keep sweets, sugary drinks and juices occasional.');
  if (focus.includes('ldl') || focus.includes('hdl')) measures.push('Choose roasted over fried snacks; keep cooking oil to ~3–4 tsp a day.');
  if (kidney) measures.push('Keep salt moderate and avoid regular painkillers without medical advice.');
  if (focus.includes('vitamin_d')) measures.push('Get 15–20 minutes of morning sunlight on arms and face.');
  measures.push(`Aim for ${ex.steps.toLocaleString()} steps a day.`);

  const startIso = startDate.toISOString().slice(0, 10);
  const planId = `plan-${report.id}`;
  const plan: HealthPlan = {
    id: planId,
    report_id: report.id,
    status: 'active',
    start_date: startIso,
    retest_date: retest.retestDateIso,
    retest_weeks: retest.weeks,
    retest_reasoning: retest.reasoning,
    targets,
    daily_targets: {
      kcal: nutrition.dailyKcal,
      protein_g: nutrition.proteinG,
      carbs_g: nutrition.carbsG,
      fat_g: nutrition.fatG,
      fibre_g: nutrition.fibreG,
      water_ml: kidney ? calculateDailyWaterMl(profile.weight_kg, 'sedentary') : calculateDailyWaterMl(profile.weight_kg, profile.activity_level),
      steps: ex.steps,
    },
    supplements_to_discuss: supplements,
    medication_talking_points: report.summary?.doctor_points ?? [],
    sleep: {
      bed: profile.sleep_time,
      wake: profile.wake_time,
      caffeine_cutoff: minutesToHHmm(Math.min(bedMin - 8 * 60, 16 * 60)),
      wind_down: ['Dim screens 45 minutes before bed', 'Light stretching, pranayama or reading', 'Keep the bedroom cool, dark and quiet'],
    },
    exercise_weekly: [
      { day: 'Mon', type: 'Brisk walk', minutes: ex.walk, intensity: 'Moderate (talk test)', steps: ['5 min warm-up', `${ex.walk - 10} min brisk pace`, '5 min cool-down'] },
      { day: 'Tue', type: 'Full-body strength', minutes: ex.strength, intensity: 'Moderate', steps: ['Squats 3×12', 'Incline push-ups 3×10', 'Plank 3×30 s'] },
      { day: 'Wed', type: 'Brisk walk', minutes: ex.walk, intensity: 'Moderate', steps: ['Steady outdoor walk', 'Focus on posture and breathing'] },
      { day: 'Thu', type: 'Yoga & mobility', minutes: 25, intensity: 'Light–moderate', steps: ['Surya namaskar ×6', 'Glute bridges 3×15', 'Bird-dog 3×10'] },
      { day: 'Fri', type: 'Brisk walk', minutes: ex.walk, intensity: 'Moderate', steps: [`${ex.walk} min steady cardio`] },
      { day: 'Sat', type: 'Strength + walk', minutes: ex.strength + 10, intensity: 'Moderate', steps: ['Band rows 3×12', 'Lunges 3×10', '20 min walk'] },
      { day: 'Sun', type: 'Active recovery', minutes: 20, intensity: 'Light', steps: ['Easy stroll and stretching'] },
    ],
    measures,
    adherence_pct: 0,
  };

  const walkAt = minutesToHHmm(wakeMin + 45);
  const tasks: PlanTask[] = [
    { id: `${planId}-walk`, plan_id: planId, type: 'exercise', title: `${ex.walk}-min brisk walk`, scheduled_at: walkAt, repeat_rule: 'daily', reminder: true, calendar_sync: true },
    { id: `${planId}-sun`, plan_id: planId, type: 'routine', title: 'Morning sunlight & 5 min breathing', scheduled_at: minutesToHHmm(wakeMin + 15), repeat_rule: 'daily', reminder: false, calendar_sync: false },
    { id: `${planId}-walk-after-lunch`, plan_id: planId, type: 'exercise', title: '10-min walk after lunch', scheduled_at: '14:00', repeat_rule: 'daily', reminder: focus.includes('glucose'), calendar_sync: false },
    { id: `${planId}-winddown`, plan_id: planId, type: 'sleep', title: `Wind-down & lights out by ${profile.sleep_time}`, scheduled_at: minutesToHHmm(bedMin - 30), repeat_rule: 'daily', reminder: true, calendar_sync: true },
  ];
  if (hasFlaggedLiverEnzymes(values)) {
    tasks.push({ id: `${planId}-noalcohol`, plan_id: planId, type: 'measure', title: 'Zero alcohol & sugary drinks today', scheduled_at: '18:00', repeat_rule: 'daily', reminder: false, calendar_sync: false });
  }
  for (const med of healthBackground.medications ?? []) {
    if (!med.trim()) continue;
    tasks.push({ id: `${planId}-med-${med.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, plan_id: planId, type: 'med', title: `Take ${med} (as prescribed)`, scheduled_at: minutesToHHmm(wakeMin + 60), repeat_rule: 'daily', reminder: true, calendar_sync: false });
  }

  return { plan, tasks };
}

/** Recompute just the daily targets after a profile/health edit, keeping the rest of the plan. */
export function refreshPlanTargets(plan: HealthPlan, profile: UserProfile, healthBackground: HealthBackground, values: NormalizedBiomarkerValue[]): HealthPlan {
  const age = ageFromDob(profile.dob) ?? 30;
  const n = calculateDailyNutritionTargets({
    sex: profile.sex,
    ageYears: age,
    heightCm: profile.height_cm,
    weightKg: profile.weight_kg,
    activityLevel: profile.activity_level,
    goal: goalFromProfile(profile.goals),
    pregnant: healthBackground.pregnant,
    underMedicalSupervision: healthBackground.under_medical_supervision,
  });
  const kidney = focusAreasFor(values).includes('kidney');
  return {
    ...plan,
    supplements_to_discuss: filterSafeSupplements(plan.supplements_to_discuss, values, healthBackground.pregnant),
    daily_targets: {
      ...plan.daily_targets,
      kcal: n.dailyKcal,
      protein_g: n.proteinG,
      carbs_g: n.carbsG,
      fat_g: n.fatG,
      fibre_g: n.fibreG,
      water_ml: calculateDailyWaterMl(profile.weight_kg, kidney ? 'sedentary' : profile.activity_level),
    },
    sleep: { ...plan.sleep, bed: profile.sleep_time, wake: profile.wake_time },
  };
}

/** Tasks that apply on a given weekday (0 = Mon). */
export function tasksForWeekday(tasks: PlanTask[], weekday: number): PlanTask[] {
  return tasks
    .filter((t) => (t.repeat_rule === 'weekdays' ? weekday < 5 : true))
    .sort((a, b) => hhmmToMinutes(a.scheduled_at) - hhmmToMinutes(b.scheduled_at));
}

/** Plan adherence over a window of days = done / scheduled task-days. */
export function computeAdherence(
  tasks: PlanTask[],
  statusByDay: Record<string, Record<string, string>>,
  dayKeys: string[],
  weekdayOf: (k: string) => number
): number {
  let scheduled = 0;
  let done = 0;
  for (const k of dayKeys) {
    const todays = tasksForWeekday(tasks, weekdayOf(k));
    scheduled += todays.length;
    done += todays.filter((t) => statusByDay[k]?.[t.id] === 'done').length;
  }
  return scheduled === 0 ? 0 : Math.round((done / scheduled) * 100);
}
