import {
  BodySystem,
  LabReportRecord,
  NormalizedBiomarkerValue,
  RawExtractedTest,
  ReportSummaryPayload,
} from '@/types/domain';
import { detectCrossMarkerPatterns, normalizeReportTests } from './biomarkerEngine';
import { evaluateRedFlags } from './redFlags';

/**
 * Deterministic report summary for ANY imported report (no LLM). Copy follows the
 * non-diagnostic rules: "may suggest", "worth discussing with your doctor".
 */

const SYSTEM_HELP: Record<BodySystem, { what_helps: string[]; action: { title: string; why: string; plan_area: string } }> = {
  Liver: {
    what_helps: [
      'Gradual, sustainable weight and waist reduction if applicable.',
      'Cut back on sugary drinks, refined snacks and alcohol.',
      'Aim for 150 minutes a week of brisk walking plus 2 strength sessions.',
    ],
    action: { title: 'Avoid alcohol and sugary drinks until your retest', why: 'Reduces direct load on liver enzymes', plan_area: 'Measures' },
  },
  'Heart & lipids': {
    what_helps: [
      'Add soluble fibre daily (oats, dal, sprouts, flaxseed, vegetables).',
      'Swap fried snacks and refined oils for measured nuts and seeds.',
      'Regular aerobic exercise is one of the most reliable ways to raise HDL.',
    ],
    action: { title: 'Hit your daily fibre target with dal, oats and salads', why: 'Soluble fibre helps lower LDL and non-HDL', plan_area: 'Meals' },
  },
  'Blood sugar': {
    what_helps: [
      'Pair carbs with protein and fibre; prefer whole grains and millets.',
      'A 10–15 minute walk after meals can blunt glucose spikes.',
      'Keep sweets and sugary drinks occasional.',
    ],
    action: { title: 'Take a 10-minute walk after lunch and dinner', why: 'Post-meal movement helps glucose control', plan_area: 'Exercise' },
  },
  Kidney: {
    what_helps: [
      'Stay well hydrated unless your doctor has advised a fluid limit.',
      'Keep salt and packaged/processed foods moderate.',
      'Avoid regular painkiller (NSAID) use without medical advice.',
    ],
    action: { title: 'Keep sodium moderate and hydrate steadily', why: 'Supports kidney markers', plan_area: 'Meals' },
  },
  Thyroid: {
    what_helps: [
      'Thyroid values are best interpreted by your doctor alongside symptoms.',
      'Use iodised salt in normal amounts and keep sleep consistent.',
    ],
    action: { title: 'Review your thyroid values with your doctor', why: 'Thyroid changes need clinical interpretation', plan_area: 'Medicines' },
  },
  'Blood count': {
    what_helps: [
      'Include iron-rich foods (dals, greens, jaggery in moderation, meat/fish if you eat them).',
      'Pair iron foods with vitamin C (lemon, amla, guava) and keep tea away from meals.',
    ],
    action: { title: 'Pair iron-rich foods with vitamin C', why: 'Improves iron absorption from plant foods', plan_area: 'Meals' },
  },
  'Vitamins & minerals': {
    what_helps: [
      'Get 15–20 minutes of morning sunlight when possible (vitamin D).',
      'Include dairy, eggs or fortified foods for B12 if your diet allows.',
    ],
    action: { title: 'Get 15 minutes of morning sunlight', why: 'Supports vitamin D levels', plan_area: 'Measures' },
  },
  Inflammation: {
    what_helps: ['Regular movement, good sleep and a fibre-rich diet support lower inflammation markers.'],
    action: { title: 'Prioritise 7–8 hours of consistent sleep', why: 'Supports recovery and inflammation markers', plan_area: 'Sleep' },
  },
  Hormones: {
    what_helps: ['Hormone values are best interpreted by your doctor alongside your history.'],
    action: { title: 'Discuss hormone values with your doctor', why: 'Needs clinical interpretation', plan_area: 'Medicines' },
  },
  Other: {
    what_helps: ['Discuss these values with your doctor for context.'],
    action: { title: 'Review flagged values with your doctor', why: 'Context from your doctor matters', plan_area: 'Medicines' },
  },
};

const FOLLOWUP_KEYWORDS: Array<[RegExp, string]> = [
  [/apo\s*-?b/i, 'Apo B'],
  [/hs-?crp/i, 'hsCRP'],
  [/lp\s*\(?a\)?/i, 'Lp(a)'],
  [/ultrasound|usg/i, 'Liver ultrasound (for your doctor to decide)'],
  [/hba1c/i, 'HbA1c'],
  [/ferritin/i, 'Ferritin'],
  [/vitamin\s*d|25-?oh/i, 'Vitamin D (25-OH)'],
  [/b12/i, 'Vitamin B12'],
  [/thyroid|tsh/i, 'Thyroid profile'],
];

function statusWord(v: NormalizedBiomarkerValue): string {
  switch (v.status) {
    case 'high':
      return v.severity > 0 ? `High (${v.severity.toFixed(2)}× upper limit)` : 'High';
    case 'low':
      return 'Low';
    case 'borderline_high':
      return 'Borderline high';
    case 'borderline_low':
      return 'Borderline low';
    default:
      return 'Normal';
  }
}

function markerPhrase(v: NormalizedBiomarkerValue): string {
  return `${v.display_name} ${v.value} ${v.unit} (ref ${v.ref_raw})`;
}

export function buildDeterministicSummary(
  values: NormalizedBiomarkerValue[],
  labNotes: string[] = []
): ReportSummaryPayload {
  const redFlags = evaluateRedFlags(values);
  const patterns = detectCrossMarkerPatterns(values);
  const flagged = values.filter((v) => v.status !== 'normal');
  const risk = values.filter((v) => v.status === 'high' || v.status === 'low');
  const watch = values.filter((v) => v.status === 'borderline_high' || v.status === 'borderline_low');
  const ok = values.filter((v) => v.status === 'normal');

  const bySystem = new Map<BodySystem, NormalizedBiomarkerValue[]>();
  for (const v of flagged) {
    bySystem.set(v.system, [...(bySystem.get(v.system) ?? []), v]);
  }
  // Order groups: most severe first
  const groups = [...bySystem.entries()].sort(
    (a, b) => Math.max(...b[1].map((m) => m.severity)) - Math.max(...a[1].map((m) => m.severity)) || b[1].length - a[1].length
  );

  const risk_groups = groups.map(([system, markers]) => {
    const list = markers.map(markerPhrase).join('; ');
    const anyHigh = markers.some((m) => m.status === 'high' || m.status === 'low');
    return {
      system,
      markers,
      explanation: `${list}. ${
        anyHigh ? 'This is outside the lab reference range and' : 'This is close to the edge of the range and'
      } may suggest an area worth focusing on with daily habits — worth discussing with your doctor.`,
      what_helps: SYSTEM_HELP[system].what_helps,
      why_rule: `Computed in code from the lab's own reference ranges: ${markers
        .map((m) => `${m.display_name} ${m.value} vs ${m.ref_raw} = ${statusWord(m)}`)
        .join('; ')}.`,
    };
  });

  const systemsNamed = groups.map(([s]) => s.toLowerCase());
  const snapshot_sentence =
    flagged.length === 0
      ? `All ${values.length} values we read are within the lab's reference ranges — keep up your current habits.`
      : `${ok.length} of ${values.length} values are in range. ${flagged.length} need attention, mainly ${systemsNamed
          .slice(0, 2)
          .join(' and ')} — small daily habits and a chat with your doctor can help.`;

  const top_actions = groups.slice(0, 4).map(([s]) => SYSTEM_HELP[s].action);
  if (flagged.length > 0 && !top_actions.some((a) => a.plan_area === 'Exercise')) {
    top_actions.push({ title: 'Walk briskly 30 minutes, 5 days a week', why: 'Supports most metabolic markers', plan_area: 'Exercise' });
  }

  const doctor_points = [
    ...flagged
      .filter((v) => v.status === 'high' || v.status === 'low')
      .slice(0, 4)
      .map((v) => `My ${v.display_name} was ${v.value} ${v.unit} (lab reference ${v.ref_raw}). What could this mean for me, and when should I retest?`),
    ...patterns.map((p) => p.doctor_question),
  ];
  if (redFlags.length > 0) {
    doctor_points.unshift('Some values crossed safety thresholds — please contact a doctor soon rather than waiting for a routine visit.');
  }

  const followups = new Set<string>();
  for (const note of labNotes) {
    for (const [re, label] of FOLLOWUP_KEYWORDS) if (re.test(note)) followups.add(label);
  }

  return {
    snapshot_sentence,
    counts: { risk: risk.length, watch: watch.length, ok: ok.length },
    red_flags: redFlags,
    risk_groups,
    ok_markers: ok,
    patterns,
    top_actions,
    doctor_points,
    followup_tests_from_lab_notes: [...followups],
  };
}

/** Shape returned by the `parse-report` AI endpoint (extraction only — status is computed here). */
export interface ParsedReportPayload {
  lab: { name: string; collected_at: string | null; reported_at?: string | null };
  panels: Array<{
    panel_name: string;
    tests: Array<{
      raw_name: string;
      method?: string | null;
      value: number | null;
      value_text: string;
      unit: string;
      ref_raw: string;
      lab_flag?: 'H' | 'L' | null;
      confidence: number;
    }>;
  }>;
  lab_notes: string[];
  extraction_warnings?: string[];
}

export function flattenParsedTests(parsed: ParsedReportPayload): RawExtractedTest[] {
  const out: RawExtractedTest[] = [];
  for (const panel of parsed.panels ?? []) {
    for (const t of panel.tests ?? []) {
      out.push({
        panel_name: panel.panel_name,
        raw_name: t.raw_name,
        method: t.method ?? undefined,
        value: typeof t.value === 'number' && Number.isFinite(t.value) ? t.value : null,
        value_text: t.value_text ?? String(t.value ?? ''),
        unit: t.unit ?? '',
        ref_raw: t.ref_raw ?? '',
        lab_flag: t.lab_flag ?? null,
        confidence: Math.min(1, Math.max(0, Number(t.confidence) || 0)),
      });
    }
  }
  return out;
}

function safeIso(s: string | null | undefined, fallback: Date): string {
  if (!s) return fallback.toISOString();
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? fallback.toISOString() : d.toISOString();
}

/** Builds a full report record (values + deterministic summary) from AI-extracted data. */
export function buildReportFromParsed(
  parsed: ParsedReportPayload,
  sourceType: 'pdf' | 'photo',
  now: Date = new Date()
): { report: LabReportRecord; unrecognisedCount: number } {
  const raw = flattenParsedTests(parsed);
  const values = normalizeReportTests(raw);
  const report: LabReportRecord = {
    id: `report-${now.getTime()}`,
    lab_name: (parsed.lab?.name || 'Imported lab report').slice(0, 80),
    collected_at: safeIso(parsed.lab?.collected_at, now),
    reported_at: safeIso(parsed.lab?.reported_at ?? null, now),
    source_type: sourceType,
    values,
    lab_notes: (parsed.lab_notes ?? []).slice(0, 12),
  };
  report.summary = buildDeterministicSummary(values, report.lab_notes);
  return { report, unrecognisedCount: values.filter((v) => v.system === 'Other').length };
}
