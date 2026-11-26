export interface ConversionResult {
  value: number;
  unit: string;
  converted: boolean;
}

const MMOL_TO_MGDL_FACTORS: Record<string, number> = {
  GLUCOSE_FASTING: 18.0182,
  GLUCOSE_PP: 18.0182,
  CHOLESTEROL_TOTAL: 38.67,
  HDL: 38.67,
  LDL: 38.67,
  VLDL: 38.67,
  NON_HDL: 38.67,
  TRIGLYCERIDES: 88.57,
  CREATININE: 0.01131, // umol/L -> mg/dL
  BILIRUBIN_TOTAL: 0.05848, // umol/L -> mg/dL
};

function normUnit(u: string): string {
  return u.trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Converts common Indian & international lab units to Svastha's canonical unit.
 */
export function convertToCanonicalUnit(
  biomarkerCode: string,
  value: number,
  fromUnit: string,
  canonicalUnit: string
): ConversionResult {
  const f = normUnit(fromUnit);
  const c = normUnit(canonicalUnit);
  if (!f || !c || f === c) {
    return { value, unit: canonicalUnit || fromUnit, converted: false };
  }

  const factor = MMOL_TO_MGDL_FACTORS[biomarkerCode];
  if (factor) {
    if ((f === 'mmol/l' || f === 'umol/l' || f === 'µmol/l') && c === 'mg/dl') {
      return {
        value: Number((value * factor).toFixed(2)),
        unit: canonicalUnit,
        converted: true,
      };
    }
    if (f === 'mg/dl' && (c === 'mmol/l' || c === 'umol/l' || c === 'µmol/l')) {
      return {
        value: Number((value / factor).toFixed(2)),
        unit: canonicalUnit,
        converted: true,
      };
    }
  }

  // g/L -> g/dL for haemoglobin / proteins
  if (f === 'g/l' && c === 'g/dl') {
    return { value: Number((value / 10).toFixed(2)), unit: canonicalUnit, converted: true };
  }
  if (f === 'g/dl' && c === 'g/l') {
    return { value: Number((value * 10).toFixed(2)), unit: canonicalUnit, converted: true };
  }

  // ng/mL <-> nmol/L for Vitamin D (25-OH)
  if (biomarkerCode === 'VITAMIN_D' && f === 'nmol/l' && c === 'ng/ml') {
    return { value: Number((value / 2.496).toFixed(2)), unit: canonicalUnit, converted: true };
  }

  return { value, unit: fromUnit, converted: false };
}
