import { BodySystem, NormalizedBiomarkerValue } from '@/types/domain';

export interface RetestWindowRule {
  group: string;
  systems: BodySystem[];
  codes: string[];
  weeks: number;
  note: string;
}

export const RETEST_WINDOWS: RetestWindowRule[] = [
  {
    group: 'Lipids (LDL, HDL, TG, non-HDL)',
    systems: ['Heart & lipids'],
    codes: ['LDL', 'HDL', 'TRIGLYCERIDES', 'NON_HDL', 'CHOLESTEROL_TOTAL'],
    weeks: 12,
    note: 'Lipid Association of India suggests >= 3 months of lifestyle measures before reassessment for low-risk profiles.',
  },
  {
    group: 'Liver enzymes (ALT, AST, GGT)',
    systems: ['Liver'],
    codes: ['ALT', 'AST', 'GGTP'],
    weeks: 12,
    note: 'Liver enzymes typically take ~12 weeks of consistent dietary and activity changes to show durable trends.',
  },
  {
    group: 'Blood sugar (HbA1c)',
    systems: [],
    codes: ['HBA1C'],
    weeks: 12,
    note: 'HbA1c reflects ~3 months of average blood glucose.',
  },
  {
    group: 'Fasting glucose',
    systems: [],
    codes: ['GLUCOSE_FASTING'],
    weeks: 10,
    note: 'Fasting glucose is typically rechecked in 8-12 weeks.',
  },
  {
    group: 'Vitamins & iron (Vitamin D, B12, Hb, Ferritin)',
    systems: ['Vitamins & minerals', 'Blood count'],
    codes: ['VITAMIN_D', 'VITAMIN_B12', 'HAEMOGLOBIN', 'FERRITIN'],
    weeks: 10,
    note: 'Micronutrient and haemoglobin levels are typically rechecked after 8-12 weeks.',
  },
  {
    group: 'Thyroid (TSH)',
    systems: ['Thyroid'],
    codes: ['TSH'],
    weeks: 8,
    note: 'TSH is typically rechecked 6-8 weeks after any doctor-led adjustment.',
  },
];

export interface RetestScheduleResult {
  weeks: number;
  retestDateIso: string;
  reasoning: string;
  flaggedMarkers: string[];
}

/**
 * Computes retest date = longest window among flagged markers, capped at 16 weeks (Section 8.3).
 */
export function calculateRetestSchedule(
  values: NormalizedBiomarkerValue[],
  startDate: Date = new Date()
): RetestScheduleResult {
  const flagged = values.filter((v) => v.status !== 'normal');
  let maxWeeks = 12;
  const matchedNotes: string[] = [];

  if (flagged.length > 0) {
    maxWeeks = 8;
    for (const v of flagged) {
      const rule = RETEST_WINDOWS.find(
        (r) => r.codes.includes(v.biomarker_code) || r.systems.includes(v.system)
      );
      if (rule) {
        if (rule.weeks > maxWeeks) maxWeeks = rule.weeks;
        if (!matchedNotes.includes(rule.note)) matchedNotes.push(rule.note);
      }
    }
  }

  const cappedWeeks = Math.min(maxWeeks, 16);
  const target = new Date(startDate.getTime() + cappedWeeks * 7 * 24 * 60 * 60 * 1000);
  const retestDateIso = target.toISOString().slice(0, 10);

  return {
    weeks: cappedWeeks,
    retestDateIso,
    reasoning:
      matchedNotes.length > 0
        ? matchedNotes.join(' ')
        : 'Standard 12-week wellness follow-up window.',
    flaggedMarkers: flagged.map((f) => f.display_name),
  };
}
