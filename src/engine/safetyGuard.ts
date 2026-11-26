import { NormalizedBiomarkerValue, SupplementOption } from '@/types/domain';

const HEPATOTOXIC_KEYWORDS = [
  'niacin',
  'nicotinic acid',
  'kava',
  'green tea extract',
  'green-tea extract',
  'egcg',
  'vitamin a',
  'retinol',
];

const FORBIDDEN_DIAGNOSTIC_PHRASES = [
  'you have ',
  'diagnosed with',
  'start taking ',
  'stop taking ',
  'increase your dose',
  'decrease your dose',
];

export function hasFlaggedLiverEnzymes(values: NormalizedBiomarkerValue[]): boolean {
  return values.some(
    (v) =>
      (v.biomarker_code === 'ALT' || v.biomarker_code === 'AST' || v.biomarker_code === 'GGTP') &&
      (v.status === 'high' || v.status === 'borderline_high')
  );
}

/**
 * Enforces Section 2.1.3 & Section 6.3:
 * - Pregnancy: disables all supplement suggestions.
 * - Flagged liver enzymes: blocks hepatotoxic-risk supplements (high-dose niacin, kava, green-tea extract, high-dose vitamin A).
 */
export function filterSafeSupplements(
  candidates: SupplementOption[],
  values: NormalizedBiomarkerValue[],
  pregnant = false
): SupplementOption[] {
  if (pregnant) return [];

  const liverFlagged = hasFlaggedLiverEnzymes(values);

  return candidates.filter((item) => {
    if (!liverFlagged) return true;
    if (item.hepatotoxic_risk) return false;
    const lower = `${item.name} ${item.typical_form}`.toLowerCase();
    return !HEPATOTOXIC_KEYWORDS.some((kw) => lower.includes(kw));
  });
}

/**
 * Audits AI-generated copy to ensure non-diagnostic, non-prescriptive language (Section 2.1.1-2).
 */
export function auditNonDiagnosticCopy(text: string): { safe: boolean; violations: string[] } {
  const lower = text.toLowerCase();
  const violations = FORBIDDEN_DIAGNOSTIC_PHRASES.filter((p) => lower.includes(p));
  return { safe: violations.length === 0, violations };
}
