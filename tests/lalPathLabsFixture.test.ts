import {
  buildSamplePlanFromReport,
  buildSampleReportRecord,
  SYNTHETIC_FOLLOWUP_RAW_TESTS,
} from '@/engine/fixtures/lalPathLabsFixture';
import { compareReports, normalizeReportTests } from '@/engine/biomarkerEngine';
import { auditNonDiagnosticCopy } from '@/engine/safetyGuard';

/**
 * Section 14 Acceptance Tests — Anonymised Dr Lal PathLabs Fixture (Male, 32 y)
 */
describe('Section 14 Acceptance: Dr Lal PathLabs Fixture', () => {
  const report = buildSampleReportRecord(new Date('2026-11-26'));
  const plan = buildSamplePlanFromReport(report, new Date('2026-11-26'));

  test('extracts and normalizes all lab values with exact expected statuses', () => {
    expect(report.values.length).toBeGreaterThanOrEqual(18);
    const byCode = new Map(report.values.map((v) => [v.biomarker_code, v]));

    expect(byCode.get('AST')?.status).toBe('high');
    expect(byCode.get('AST')?.severity).toBeCloseTo(1.15, 2);

    expect(byCode.get('ALT')?.status).toBe('high');
    expect(byCode.get('ALT')?.severity).toBeCloseTo(2.0, 2);

    expect(byCode.get('HDL')?.status).toBe('low');
    expect(byCode.get('LDL')?.status).toBe('borderline_high');
    expect(byCode.get('NON_HDL')?.status).toBe('borderline_high');

    expect(byCode.get('GLUCOSE_FASTING')?.status).toBe('normal');
    expect(byCode.get('CHOLESTEROL_TOTAL')?.status).toBe('normal');
    expect(byCode.get('TRIGLYCERIDES')?.status).toBe('normal');
  });

  test('fires zero red flags for the Section 14 fixture', () => {
    expect(report.summary?.red_flags).toHaveLength(0);
  });

  test('groups risk markers under Liver and Heart & lipids and fires metabolic pattern', () => {
    const systems = report.summary?.risk_groups.map((g) => g.system) ?? [];
    expect(systems).toEqual(expect.arrayContaining(['Liver', 'Heart & lipids']));

    const patternIds = report.summary?.patterns.map((p) => p.rule_id) ?? [];
    expect(patternIds).toContain('pattern_metabolic_liver_hdl');
  });

  test('includes Apo B, hsCRP, Lp(a) follow-up tests and LAI >= 3 months talking point', () => {
    expect(report.summary?.followup_tests_from_lab_notes).toEqual(
      expect.arrayContaining(['Apo B', 'hsCRP', 'Lp(a)'])
    );
    expect(report.summary?.doctor_points.join(' ')).toContain('3 months');
    expect(auditNonDiagnosticCopy(report.summary?.snapshot_sentence ?? '').safe).toBe(true);
  });

  test('excludes hepatotoxic supplements (Niacin, Green-tea extract) and sets 12-week retest date', () => {
    const names = plan.supplements_to_discuss.map((s) => s.name.toLowerCase());
    expect(names.some((n) => n.includes('niacin'))).toBe(false);
    expect(names.some((n) => n.includes('green-tea'))).toBe(false);
    expect(plan.retest_weeks).toBe(12);
    expect(plan.targets.map((t) => t.biomarker_code)).toEqual(
      expect.arrayContaining(['ALT', 'AST', 'HDL', 'LDL', 'NON_HDL'])
    );
  });

  test('Phase 5 comparison against synthetic 12-week follow-up shows all 5 flagged markers improved', () => {
    const followUp = normalizeReportTests(SYNTHETIC_FOLLOWUP_RAW_TESTS);
    const cmp = compareReports(report.values, followUp);
    expect(cmp.flaggedPreviousCount).toBe(5);
    expect(cmp.improvedCount).toBe(5);
    expect(cmp.headline).toBe('5 of 5 flagged values improved.');
  });
});
