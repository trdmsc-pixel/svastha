import { computeBiomarkerStatus, parseReferenceRange } from '@/engine/referenceRange';
import { convertToCanonicalUnit } from '@/engine/unitConversion';
import { evaluateRedFlags } from '@/engine/redFlags';
import { calculateDailyNutritionTargets, calculateDailyWaterMl } from '@/engine/nutritionEngine';
import { calculateRetestSchedule } from '@/engine/retestCalculator';
import { computeNutrientsForGrams, matchFoodByQuery } from '@/engine/foodMatcher';
import { auditNonDiagnosticCopy, filterSafeSupplements } from '@/engine/safetyGuard';
import { normalizeReportTests } from '@/engine/biomarkerEngine';

describe('Reference-range parser & deterministic status engine', () => {
  test('parses all operator formats (<, <=, >, >=, range)', () => {
    expect(parseReferenceRange('<50')).toEqual({ raw: '<50', operator: '<', low: null, high: 50 });
    expect(parseReferenceRange('<= 50')).toEqual({ raw: '<= 50', operator: '<=', low: null, high: 50 });
    expect(parseReferenceRange('≤100')).toEqual({ raw: '≤100', operator: '<=', low: null, high: 100 });
    expect(parseReferenceRange('>40')).toEqual({ raw: '>40', operator: '>', low: 40, high: null });
    expect(parseReferenceRange('≥40')).toEqual({ raw: '≥40', operator: '>=', low: 40, high: null });
    expect(parseReferenceRange('70 - 100')).toEqual({ raw: '70 - 100', operator: 'range', low: 70, high: 100 });
    expect(parseReferenceRange('30–120')).toEqual({ raw: '30–120', operator: 'range', low: 30, high: 120 });
  });

  test('computes normal, borderline (<=10%), high, low and severity ratio', () => {
    const lt50 = parseReferenceRange('<50');
    expect(computeBiomarkerStatus(42, lt50)).toEqual({ status: 'normal', severity: 0, isFlagged: false });
    expect(computeBiomarkerStatus(99.8, lt50)).toEqual({ status: 'high', severity: 2, isFlagged: true });
    expect(computeBiomarkerStatus(57.6, lt50)).toEqual({ status: 'high', severity: 1.15, isFlagged: true });

    const lt100 = parseReferenceRange('<100');
    expect(computeBiomarkerStatus(106.9, lt100).status).toBe('borderline_high');

    const gt40 = parseReferenceRange('>40');
    expect(computeBiomarkerStatus(29.1, gt40).status).toBe('low');
  });
});

describe('Unit conversions', () => {
  test('converts glucose mmol/L to mg/dL', () => {
    const res = convertToCanonicalUnit('GLUCOSE_FASTING', 5.0, 'mmol/L', 'mg/dL');
    expect(res.converted).toBe(true);
    expect(res.value).toBeCloseTo(90.09, 1);
  });

  test('converts Vitamin D nmol/L to ng/mL', () => {
    const res = convertToCanonicalUnit('VITAMIN_D', 75, 'nmol/L', 'ng/mL');
    expect(res.converted).toBe(true);
    expect(res.value).toBeCloseTo(30.05, 1);
  });
});

describe('Red-flag safety rules (Section 2.1.4)', () => {
  test('fires critical alerts for glucose >= 250, ALT > 5x ULN, potassium > 6.0', () => {
    const values = normalizeReportTests([
      { panel_name: 'Glucose', raw_name: 'Fasting plasma glucose', value: 265, value_text: '265', unit: 'mg/dL', ref_raw: '70-100', confidence: 0.99 },
      { panel_name: 'LFT', raw_name: 'ALT (SGPT)', value: 270, value_text: '270', unit: 'U/L', ref_raw: '<50', confidence: 0.99 },
      { panel_name: 'Kidney', raw_name: 'Potassium', value: 6.3, value_text: '6.3', unit: 'mmol/L', ref_raw: '3.5-5.1', confidence: 0.99 },
    ]);
    const alerts = evaluateRedFlags(values);
    expect(alerts.map((a) => a.rule_id)).toEqual(
      expect.arrayContaining(['rf_glucose_high', 'rf_alt_5x', 'rf_potassium_high'])
    );
  });
});

describe('Nutrition & Hydration Engine (Section 8.3)', () => {
  test('enforces calorie floors and blocks deficit during pregnancy', () => {
    const womanLow = calculateDailyNutritionTargets({
      sex: 'F',
      ageYears: 30,
      heightCm: 155,
      weightKg: 50,
      activityLevel: 'sedentary',
      goal: 'lose_weight',
    });
    expect(womanLow.dailyKcal).toBeGreaterThanOrEqual(1200);

    const pregnant = calculateDailyNutritionTargets({
      sex: 'F',
      ageYears: 29,
      heightCm: 162,
      weightKg: 65,
      activityLevel: 'light',
      goal: 'lose_weight',
      pregnant: true,
    });
    expect(pregnant.dailyKcal).toBe(pregnant.tdee);
    expect(pregnant.deficitBlockedReason).toContain('pregnancy');
  });

  test('computes weather-aware hydration boost on hot days', () => {
    const mild = calculateDailyWaterMl(75, 'moderate', 26);
    const hot = calculateDailyWaterMl(75, 'moderate', 40);
    expect(hot).toBeGreaterThan(mild);
  });
});

describe('Retest calculator & IFCT 2017 food matcher', () => {
  test('caps retest schedule at 16 weeks and uses 12 weeks for lipids/liver', () => {
    const vals = normalizeReportTests([
      { panel_name: 'LFT', raw_name: 'ALT', value: 85, value_text: '85', unit: 'U/L', ref_raw: '<50', confidence: 0.99 },
    ]);
    const sched = calculateRetestSchedule(vals, new Date('2026-11-26'));
    expect(sched.weeks).toBe(12);
    expect(sched.retestDateIso).toBe('2027-02-18');
  });

  test('matches Indian dishes and computes macros strictly from IFCT 2017 DB', () => {
    const dal = matchFoodByQuery('dal tadka');
    expect(dal?.id).toBe('ifct_dal_tadka');
    const macros = computeNutrientsForGrams(dal!, 180);
    expect(macros.kcal).toBe(212);
    expect(macros.protein_g).toBeCloseTo(11.5, 1);
  });

  test('blocks diagnostic phrases and filters supplements in pregnancy', () => {
    expect(auditNonDiagnosticCopy('You have fatty liver disease').safe).toBe(false);
    expect(auditNonDiagnosticCopy('This pattern may suggest fatty liver — worth discussing with your doctor.').safe).toBe(true);
    expect(filterSafeSupplements([{ name: 'Omega-3', why_biomarker: 'HDL', evidence: 'Moderate', typical_form: 'Capsule' }], [], true)).toHaveLength(0);
  });
});
