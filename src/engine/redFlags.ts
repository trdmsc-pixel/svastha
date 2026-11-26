import { NormalizedBiomarkerValue, RedFlagAlert, RedFlagRule } from '@/types/domain';

export const DEFAULT_RED_FLAG_RULES: RedFlagRule[] = [
  {
    id: 'rf_glucose_high',
    biomarker_code: 'GLUCOSE_FASTING',
    operator: '>=',
    threshold: 250,
    unit: 'mg/dL',
    message: 'Fasting glucose is 250 mg/dL or higher. Please contact a doctor promptly.',
  },
  {
    id: 'rf_glucose_low',
    biomarker_code: 'GLUCOSE_FASTING',
    operator: '<',
    threshold: 54,
    unit: 'mg/dL',
    message: 'Fasting glucose is below 54 mg/dL (critical low). Please seek prompt medical care.',
  },
  {
    id: 'rf_hba1c_high',
    biomarker_code: 'HBA1C',
    operator: '>=',
    threshold: 10,
    unit: '%',
    message: 'HbA1c is 10% or higher. Please review this result with a doctor soon.',
  },
  {
    id: 'rf_hb_low',
    biomarker_code: 'HAEMOGLOBIN',
    operator: '<',
    threshold: 8,
    unit: 'g/dL',
    message: 'Haemoglobin is below 8 g/dL. Please consult a doctor promptly.',
  },
  {
    id: 'rf_alt_5x',
    biomarker_code: 'ALT',
    operator: 'xULN>',
    threshold: 5,
    unit: 'U/L',
    message: 'ALT is more than 5× the upper reference limit. Please contact a doctor promptly.',
  },
  {
    id: 'rf_ast_5x',
    biomarker_code: 'AST',
    operator: 'xULN>',
    threshold: 5,
    unit: 'U/L',
    message: 'AST is more than 5× the upper reference limit. Please contact a doctor promptly.',
  },
  {
    id: 'rf_potassium_low',
    biomarker_code: 'POTASSIUM',
    operator: '<',
    threshold: 3.0,
    unit: 'mmol/L',
    message: 'Potassium is below 3.0 mmol/L. Please seek prompt medical review.',
  },
  {
    id: 'rf_potassium_high',
    biomarker_code: 'POTASSIUM',
    operator: '>',
    threshold: 6.0,
    unit: 'mmol/L',
    message: 'Potassium is above 6.0 mmol/L. Please seek prompt medical attention.',
  },
  {
    id: 'rf_creatinine_2x',
    biomarker_code: 'CREATININE',
    operator: 'xULN>',
    threshold: 2,
    unit: 'mg/dL',
    message: 'Creatinine is more than 2× the upper reference limit. Please contact a doctor soon.',
  },
  {
    id: 'rf_tsh_low',
    biomarker_code: 'TSH',
    operator: '<',
    threshold: 0.1,
    unit: 'mIU/L',
    message: 'TSH is below 0.1 mIU/L. Please discuss promptly with a doctor.',
  },
  {
    id: 'rf_tsh_high',
    biomarker_code: 'TSH',
    operator: '>',
    threshold: 20,
    unit: 'mIU/L',
    message: 'TSH is above 20 mIU/L. Please discuss promptly with a doctor.',
  },
  {
    id: 'rf_platelets_low',
    biomarker_code: 'PLATELETS',
    operator: '<',
    threshold: 50000,
    unit: '/µL',
    message: 'Platelets are below 50,000/µL. Please seek prompt medical evaluation.',
  },
];

export function evaluateRedFlags(
  values: NormalizedBiomarkerValue[],
  rules: RedFlagRule[] = DEFAULT_RED_FLAG_RULES
): RedFlagAlert[] {
  const alerts: RedFlagAlert[] = [];

  for (const val of values) {
    for (const rule of rules) {
      if (rule.biomarker_code !== val.biomarker_code) continue;

      let triggered = false;
      if (rule.operator === '>=' && val.value >= rule.threshold) triggered = true;
      if (rule.operator === '>' && val.value > rule.threshold) triggered = true;
      if (rule.operator === '<=' && val.value <= rule.threshold) triggered = true;
      if (rule.operator === '<' && val.value < rule.threshold) triggered = true;
      if (rule.operator === 'xULN>') {
        const uln = val.ref_high;
        if (uln && uln > 0 && val.value / uln > rule.threshold) {
          triggered = true;
        }
      }

      if (triggered) {
        alerts.push({
          rule_id: rule.id,
          biomarker_code: val.biomarker_code,
          display_name: val.display_name,
          value: val.value,
          unit: val.unit,
          message: rule.message,
        });
      }
    }
  }

  return alerts;
}
