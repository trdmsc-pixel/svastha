import { HealthPlan, LabReportRecord, NormalizedBiomarkerValue } from '@/types/domain';

const MED_PATTERN = /\b(dose|dosage|mg\b|tablet|pill|statin|metformin|insulin|thyroxine|levothyroxine|medicine|medication|prescri|stop taking|start taking|should i take|increase|decrease)\b/i;
const URGENT_PATTERN = /\b(chest pain|faint|unconscious|can'?t breathe|breathless|bleeding|suicid|stroke|seizure)\b/i;

export type GuardResult = { blocked: true; reply: string } | { blocked: false };

/** Deterministic safety guard applied BEFORE any AI call (CLAUDE.md rule 1). */
export function guardQuestion(question: string): GuardResult {
  if (URGENT_PATTERN.test(question)) {
    return { blocked: true, reply: 'This sounds like it could be urgent. Please call 112 or go to the nearest emergency department now. Svastha can’t help with emergencies.' };
  }
  if (MED_PATTERN.test(question) && /\b(dose|dosage|should i|start|stop|increase|decrease|change|how much)\b/i.test(question)) {
    return {
      blocked: true,
      reply: 'I can’t advise on starting, stopping or changing any medicine or dose — that has to come from your doctor, who knows your full history. I can help you prepare: ask me which of your values are worth raising at your next visit.',
    };
  }
  return { blocked: false };
}

const statusWord = (v: NormalizedBiomarkerValue) =>
  ({ high: 'high', low: 'low', borderline_high: 'slightly high (borderline)', borderline_low: 'slightly low (borderline)', normal: 'within range' })[v.status];

function findMarkers(question: string, values: NormalizedBiomarkerValue[]): NormalizedBiomarkerValue[] {
  const q = question.toLowerCase();
  return values.filter((v) => {
    const names = [v.biomarker_code, v.display_name, v.raw_name].map((s) => s.toLowerCase().replace(/[()]/g, ' '));
    return names.some((n) => n.split(/[\s,/]+/).some((tok) => tok.length >= 3 && new RegExp(`\\b${tok.replace(/[.*+?^${}|[\]\\]/g, '\\$&')}\\b`).test(q)));
  });
}

/** On-device answer from the user's own report when the AI service isn't reachable. */
export function answerLocally(question: string, report: LabReportRecord | undefined, plan: HealthPlan | null): string {
  if (!report) return 'You haven’t imported a lab report yet. Scan a PDF or photos of your report and I’ll explain each value.';
  const hits = findMarkers(question, report.values);
  if (hits.length > 0) {
    return hits
      .slice(0, 3)
      .map((v) => {
        const target = plan?.targets.find((t) => t.biomarker_code === v.biomarker_code);
        return `${v.display_name} is ${v.value} ${v.unit} (lab range ${v.ref_raw}) — ${statusWord(v)}.${v.severity > 1 ? ` That’s ${v.severity.toFixed(1)}× the upper limit.` : ''}${target ? ` Your plan target is ${target.target} ${target.unit} by your retest on ${plan?.retest_date}.` : ''}`;
      })
      .join('\n\n')
      .concat('\n\nWorth discussing with your doctor if anything is flagged.');
  }
  const flagged = report.values.filter((v) => v.status !== 'normal');
  if (flagged.length === 0) return `All ${report.values.length} values in your ${report.lab_name} report are within the lab’s reference ranges. Ask me about any marker by name.`;
  return `In your ${report.lab_name} report, ${flagged.length} value${flagged.length > 1 ? 's need' : ' needs'} attention: ${flagged
    .slice(0, 5)
    .map((v) => `${v.display_name} ${v.value} ${v.unit} (${statusWord(v)})`)
    .join('; ')}. Ask me about any of them by name, e.g. “What does my ${flagged[0].display_name} mean?”`;
}

/** Minimal, non-identifying context sent to the AI (data minimisation). */
export function buildChatContext(report: LabReportRecord | undefined, plan: HealthPlan | null, extra: Record<string, unknown> = {}) {
  return {
    report: report
      ? {
          lab: report.lab_name,
          collected_at: report.collected_at.slice(0, 10),
          values: report.values.map((v) => ({ code: v.biomarker_code, name: v.display_name, value: v.value, unit: v.unit, ref: v.ref_raw, status: v.status, severity: v.severity })),
          red_flags: report.summary?.red_flags.map((r) => r.message) ?? [],
          lab_notes: report.lab_notes.slice(0, 6),
        }
      : null,
    plan: plan ? { targets: plan.targets, retest_date: plan.retest_date, daily_targets: plan.daily_targets } : null,
    ...extra,
  };
}

export function suggestedQuestions(report: LabReportRecord | undefined): string[] {
  const flagged = report?.values.filter((v) => v.status !== 'normal').slice(0, 2) ?? [];
  return [
    ...flagged.map((v) => `What does my ${v.display_name} of ${v.value} mean?`),
    'What should I eat to improve my flagged values?',
    'What should I ask my doctor?',
  ].slice(0, 4);
}
