import {
  BodySystem,
  CrossMarkerPattern,
  NormalizedBiomarkerValue,
  RawExtractedTest,
} from '@/types/domain';
import { computeBiomarkerStatus, parseReferenceRange } from './referenceRange';
import { convertToCanonicalUnit } from './unitConversion';

export interface BiomarkerDictEntry {
  code: string;
  display_name: string;
  synonyms: string[];
  system: BodySystem;
  canonical_unit: string;
  default_ref_raw: string;
}

export const BIOMARKER_DICTIONARY: BiomarkerDictEntry[] = [
  { code: 'AST', display_name: 'AST (SGOT)', synonyms: ['sgot', 'ast', 'ast (sgot)', 'aspartate aminotransferase'], system: 'Liver', canonical_unit: 'U/L', default_ref_raw: '<50' },
  { code: 'ALT', display_name: 'ALT (SGPT)', synonyms: ['sgpt', 'alt', 'alt (sgpt)', 'alanine aminotransferase'], system: 'Liver', canonical_unit: 'U/L', default_ref_raw: '<50' },
  { code: 'AST_ALT_RATIO', display_name: 'AST:ALT Ratio', synonyms: ['ast:alt ratio', 'ast/alt ratio', 'ast alt ratio'], system: 'Liver', canonical_unit: 'ratio', default_ref_raw: '<1.00' },
  { code: 'GGTP', display_name: 'GGTP (GGT)', synonyms: ['ggtp', 'ggt', 'gamma gt', 'gamma glutamyl transferase'], system: 'Liver', canonical_unit: 'U/L', default_ref_raw: '<55' },
  { code: 'ALP', display_name: 'Alkaline Phosphatase (ALP)', synonyms: ['alp', 'alkaline phosphatase'], system: 'Liver', canonical_unit: 'U/L', default_ref_raw: '30-120' },
  { code: 'BILIRUBIN_TOTAL', display_name: 'Bilirubin Total', synonyms: ['bilirubin total', 'total bilirubin'], system: 'Liver', canonical_unit: 'mg/dL', default_ref_raw: '0.30-1.20' },
  { code: 'BILIRUBIN_DIRECT', display_name: 'Bilirubin Direct', synonyms: ['bilirubin direct', 'direct bilirubin', 'conjugated bilirubin'], system: 'Liver', canonical_unit: 'mg/dL', default_ref_raw: '<0.20' },
  { code: 'BILIRUBIN_INDIRECT', display_name: 'Bilirubin Indirect', synonyms: ['bilirubin indirect', 'indirect bilirubin', 'unconjugated bilirubin'], system: 'Liver', canonical_unit: 'mg/dL', default_ref_raw: '<1.10' },
  { code: 'TOTAL_PROTEIN', display_name: 'Total Protein', synonyms: ['total protein', 'protein, total'], system: 'Liver', canonical_unit: 'g/dL', default_ref_raw: '6.40-8.30' },
  { code: 'ALBUMIN', display_name: 'Albumin', synonyms: ['albumin', 'serum albumin'], system: 'Liver', canonical_unit: 'g/dL', default_ref_raw: '3.50-5.20' },
  { code: 'GLOBULIN', display_name: 'Globulin', synonyms: ['globulin', 'serum globulin'], system: 'Liver', canonical_unit: 'g/dL', default_ref_raw: '2.00-3.50' },
  { code: 'AG_RATIO', display_name: 'A:G Ratio', synonyms: ['a:g ratio', 'a/g ratio', 'albumin globulin ratio'], system: 'Liver', canonical_unit: 'ratio', default_ref_raw: '0.90-2.00' },
  { code: 'GLUCOSE_FASTING', display_name: 'Fasting Plasma Glucose', synonyms: ['fasting plasma glucose', 'fasting glucose', 'fbs', 'glucose fasting'], system: 'Blood sugar', canonical_unit: 'mg/dL', default_ref_raw: '70-100' },
  { code: 'HBA1C', display_name: 'HbA1c', synonyms: ['hba1c', 'glycosylated haemoglobin', 'glycated hemoglobin'], system: 'Blood sugar', canonical_unit: '%', default_ref_raw: '<5.7' },
  { code: 'CHOLESTEROL_TOTAL', display_name: 'Total Cholesterol', synonyms: ['total cholesterol', 'cholesterol, total', 'cholesterol total'], system: 'Heart & lipids', canonical_unit: 'mg/dL', default_ref_raw: '<200' },
  { code: 'TRIGLYCERIDES', display_name: 'Triglycerides', synonyms: ['triglycerides', 'tg', 'serum triglycerides'], system: 'Heart & lipids', canonical_unit: 'mg/dL', default_ref_raw: '<150' },
  { code: 'HDL', display_name: 'HDL Cholesterol', synonyms: ['hdl', 'hdl cholesterol', 'cholesterol hdl'], system: 'Heart & lipids', canonical_unit: 'mg/dL', default_ref_raw: '>40' },
  { code: 'LDL', display_name: 'LDL Cholesterol', synonyms: ['ldl', 'ldl (calc.)', 'ldl cholesterol', 'cholesterol ldl'], system: 'Heart & lipids', canonical_unit: 'mg/dL', default_ref_raw: '<100' },
  { code: 'VLDL', display_name: 'VLDL Cholesterol', synonyms: ['vldl', 'vldl cholesterol'], system: 'Heart & lipids', canonical_unit: 'mg/dL', default_ref_raw: '<30' },
  { code: 'NON_HDL', display_name: 'Non-HDL Cholesterol', synonyms: ['non-hdl', 'non hdl', 'non-hdl cholesterol'], system: 'Heart & lipids', canonical_unit: 'mg/dL', default_ref_raw: '<130' },
  { code: 'CREATININE', display_name: 'Serum Creatinine', synonyms: ['creatinine', 'serum creatinine'], system: 'Kidney', canonical_unit: 'mg/dL', default_ref_raw: '0.70-1.30' },
  { code: 'POTASSIUM', display_name: 'Serum Potassium', synonyms: ['potassium', 'serum potassium', 'k+'], system: 'Kidney', canonical_unit: 'mmol/L', default_ref_raw: '3.5-5.1' },
  { code: 'TSH', display_name: 'TSH', synonyms: ['tsh', 'thyroid stimulating hormone'], system: 'Thyroid', canonical_unit: 'mIU/L', default_ref_raw: '0.4-4.5' },
  { code: 'HAEMOGLOBIN', display_name: 'Haemoglobin', synonyms: ['haemoglobin', 'hemoglobin', 'hb'], system: 'Blood count', canonical_unit: 'g/dL', default_ref_raw: '13.0-17.0' },
  { code: 'PLATELETS', display_name: 'Platelet Count', synonyms: ['platelets', 'platelet count', 'plt'], system: 'Blood count', canonical_unit: '/µL', default_ref_raw: '150000-410000' },
  { code: 'VITAMIN_D', display_name: 'Vitamin D (25-OH)', synonyms: ['vitamin d', '25-oh vitamin d', 'vit d'], system: 'Vitamins & minerals', canonical_unit: 'ng/mL', default_ref_raw: '30-100' },
  { code: 'VITAMIN_B12', display_name: 'Vitamin B12', synonyms: ['vitamin b12', 'vit b12', 'cobalamin'], system: 'Vitamins & minerals', canonical_unit: 'pg/mL', default_ref_raw: '211-911' },
  { code: 'FERRITIN', display_name: 'Serum Ferritin', synonyms: ['ferritin', 'serum ferritin'], system: 'Vitamins & minerals', canonical_unit: 'ng/mL', default_ref_raw: '30-400' },
];

export function matchBiomarker(rawName: string): BiomarkerDictEntry | null {
  const key = rawName.trim().toLowerCase();
  for (const entry of BIOMARKER_DICTIONARY) {
    if (entry.display_name.toLowerCase() === key || entry.code.toLowerCase() === key) {
      return entry;
    }
    if (entry.synonyms.some((syn) => syn === key)) {
      return entry;
    }
  }
  for (const entry of BIOMARKER_DICTIONARY) {
    if (entry.synonyms.some((syn) => key.includes(syn))) {
      return entry;
    }
  }
  return null;
}

export function normalizeReportTests(rawTests: RawExtractedTest[]): NormalizedBiomarkerValue[] {
  return rawTests
    .filter((t) => t.value !== null && !Number.isNaN(t.value))
    .map((t) => {
      const dict = matchBiomarker(t.raw_name);
      const code = dict?.code ?? t.raw_name.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
      const canonicalUnit = dict?.canonical_unit ?? t.unit;
      const converted = convertToCanonicalUnit(code, t.value as number, t.unit, canonicalUnit);

      const usedDefaultRange = !t.ref_raw || t.ref_raw.trim() === '';
      const rangeStr = usedDefaultRange ? dict?.default_ref_raw ?? '' : t.ref_raw;
      const parsedRange = parseReferenceRange(rangeStr);
      const computed = computeBiomarkerStatus(converted.value, parsedRange);

      return {
        biomarker_code: code,
        display_name: dict?.display_name ?? t.raw_name,
        raw_name: t.raw_name,
        panel_name: t.panel_name,
        system: dict?.system ?? 'Other',
        value: converted.value,
        value_text: t.value_text,
        unit: converted.unit,
        original_value: converted.converted ? (t.value as number) : undefined,
        original_unit: converted.converted ? t.unit : undefined,
        ref_raw: rangeStr,
        ref_low: parsedRange.low,
        ref_high: parsedRange.high,
        ref_operator: parsedRange.operator,
        used_default_range: usedDefaultRange,
        status: computed.status,
        severity: computed.severity,
        lab_flag: t.lab_flag ?? null,
        confidence: t.confidence,
      };
    });
}

export function detectCrossMarkerPatterns(values: NormalizedBiomarkerValue[]): CrossMarkerPattern[] {
  const byCode = new Map(values.map((v) => [v.biomarker_code, v]));
  const patterns: CrossMarkerPattern[] = [];

  const alt = byCode.get('ALT');
  const ast = byCode.get('AST');
  const hdl = byCode.get('HDL');
  const ldl = byCode.get('LDL');
  const nonHdl = byCode.get('NON_HDL');

  const liverHigh =
    (alt && (alt.status === 'high' || alt.status === 'borderline_high')) ||
    (ast && (ast.status === 'high' || ast.status === 'borderline_high'));
  const hdlLow = hdl && (hdl.status === 'low' || hdl.status === 'borderline_low');

  if (liverHigh && hdlLow) {
    patterns.push({
      rule_id: 'pattern_metabolic_liver_hdl',
      markers: [
        ...(alt && alt.status !== 'normal' ? ['ALT'] : []),
        ...(ast && ast.status !== 'normal' ? ['AST'] : []),
        'HDL',
      ],
      title: 'Metabolic pattern (raised liver enzymes + low HDL)',
      insight:
        'Raised liver enzymes alongside low HDL often appear together as a metabolic pattern; non-alcoholic fatty liver is a common cause worth discussing with your doctor.',
      doctor_question:
        'Given my raised ALT/AST and low HDL, should we consider a liver ultrasound or additional metabolic checks?',
    });
  }

  const lipidHigh =
    (ldl && (ldl.status === 'high' || ldl.status === 'borderline_high')) ||
    (nonHdl && (nonHdl.status === 'high' || nonHdl.status === 'borderline_high'));

  if (lipidHigh && hdlLow) {
    patterns.push({
      rule_id: 'pattern_atherogenic_lipids',
      markers: [
        'HDL',
        ...(ldl && ldl.status !== 'normal' ? ['LDL'] : []),
        ...(nonHdl && nonHdl.status !== 'normal' ? ['NON_HDL'] : []),
      ],
      title: 'Borderline-elevated atherogenic lipids with low HDL',
      insight:
        'Low HDL combined with mildly elevated LDL and non-HDL may suggest higher long-term cardiovascular risk over time, worth discussing with your doctor.',
      doctor_question:
        'Would a 3-month lifestyle approach first fit my risk level, and should we check Apo B, hsCRP, or Lp(a)?',
    });
  }

  return patterns;
}

export interface ReportComparisonItem {
  biomarker_code: string;
  display_name: string;
  previous_value: number;
  current_value: number;
  unit: string;
  delta: number;
  direction: 'improved' | 'worse' | 'unchanged';
}

export function compareReports(
  previous: NormalizedBiomarkerValue[],
  current: NormalizedBiomarkerValue[]
): {
  items: ReportComparisonItem[];
  improvedCount: number;
  flaggedPreviousCount: number;
  headline: string;
} {
  const prevMap = new Map(previous.map((v) => [v.biomarker_code, v]));
  const items: ReportComparisonItem[] = [];
  let improvedCount = 0;
  let flaggedPreviousCount = 0;

  for (const cur of current) {
    const prev = prevMap.get(cur.biomarker_code);
    if (!prev) continue;
    const delta = Number((cur.value - prev.value).toFixed(2));
    const wasFlagged = prev.status !== 'normal';
    if (wasFlagged) flaggedPreviousCount++;

    let direction: 'improved' | 'worse' | 'unchanged' = 'unchanged';
    if (delta !== 0) {
      if (prev.status === 'high' || prev.status === 'borderline_high') {
        direction = cur.value < prev.value ? 'improved' : 'worse';
      } else if (prev.status === 'low' || prev.status === 'borderline_low') {
        direction = cur.value > prev.value ? 'improved' : 'worse';
      } else if (cur.status !== 'normal') {
        direction = 'worse';
      }
    }

    if (wasFlagged && direction === 'improved') improvedCount++;
    items.push({
      biomarker_code: cur.biomarker_code,
      display_name: cur.display_name,
      previous_value: prev.value,
      current_value: cur.value,
      unit: cur.unit,
      delta,
      direction,
    });
  }

  return {
    items,
    improvedCount,
    flaggedPreviousCount,
    headline: `${improvedCount} of ${flaggedPreviousCount} flagged values improved.`,
  };
}
