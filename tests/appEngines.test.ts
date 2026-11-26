import { z } from 'zod';
import { mapAiMealToDraft, rescaleDraftItem, suggestSlot } from '@/engine/mealAnalysis';
import { buildReportFromParsed, buildDeterministicSummary } from '@/engine/reportSummary';
import { buildReminderSchedule, DEFAULT_NOTIFICATION_PREFS, isInQuietHours } from '@/engine/reminderSchedule';
import { CURATED_RECIPES, rankRecipes, recipeExclusionReason } from '@/engine/recipeEngine';
import { answerLocally, guardQuestion } from '@/engine/reportChat';
import { buildPersonalPlan, computeAdherence, focusAreasFor } from '@/engine/planBuilder';
import { searchFoods, matchFoodByQuery } from '@/engine/foodMatcher';
import { addDays, addMonths, ageFromDob, monthGrid, weekdayIndex } from '@/lib/dates';
import { buildSampleReportRecord } from '@/engine/fixtures/lalPathLabsFixture';
import { attachmentsFrom, buildSchemas, minimiseChatContext } from '../supabase/functions/_shared/schemas';
import { blankHealth, blankProfile } from '@/store/useAppStore';


const schemas = buildSchemas(z);
const report = buildSampleReportRecord(new Date('2026-11-26'));
const profile = { ...blankProfile('u1'), full_name: 'Test', dob: '1990-01-01', diet_type: 'vegetarian' as const };
const health = blankHealth('u1');

describe('server schemas & attachments', () => {
  test('PDF uploads become a Gemini attachment (regression: pdfBase64 was ignored)', () => {
    const a = attachmentsFrom({ pdfBase64: 'JVBERi0x' });
    expect(a).toEqual([{ mimeType: 'application/pdf', data: 'JVBERi0x' }]);
    expect(attachmentsFrom({ pagesBase64: [{ mimeType: 'image/jpeg', data: 'x' }], imageBase64: 'y' })).toHaveLength(2);
  });

  test('report schema tolerates missing optional fields and string numbers', () => {
    const parsed = schemas.parseReport.parse({ panels: [{ tests: [{ raw_name: 'ALT (SGPT)', value: '99.8', unit: 'U/L', ref_raw: '<50', lab_flag: 'HIGH' }] }] });
    expect(parsed.lab.name).toBe('Imported lab report');
    expect(parsed.panels[0].tests[0].value).toBe(99.8);
    expect(parsed.panels[0].tests[0].lab_flag).toBeNull();
    expect(parsed.extraction_warnings).toEqual([]);
  });

  test('meal schema keeps per-100 g estimates for unknown foods', () => {
    const m = schemas.analyseMeal.parse({ items: [{ name: 'Mystery curry', estimated_per_100g: { kcal: '150' } }] });
    expect(m.items[0].estimated_per_100g.kcal).toBe(150);
    expect(m.is_food).toBe(true);
  });

  test('chat context strips identifying fields', () => {
    expect(JSON.stringify(minimiseChatContext({ full_name: 'A B', email: 'a@b.c', value: 1 }))).not.toMatch(/A B|a@b\.c/);
  });
});

describe('meal photo mapping (calories from database, not AI)', () => {
  test('matches foods and uses household units', () => {
    const items = mapAiMealToDraft({ is_food: true, items: [{ name: 'Roti', match_hint: 'roti', portion: { amount: 2, unit: 'roti', grams_est: 999 }, confidence: 0.9 }] });
    expect(items[0].food_id).toBe('ifct_roti');
    expect(items[0].grams).toBe(70);
    expect(items[0].nutrients.kcal).toBe(Math.round(297 * 0.7));
  });

  test('unknown food keeps a labelled, clamped AI estimate', () => {
    const items = mapAiMealToDraft({ is_food: true, items: [{ name: 'Zxqv special', portion: { amount: 1, unit: 'plate', grams_est: 200 }, confidence: 0.5, estimated_per_100g: { kcal: 5000, protein_g: 5 } }] });
    expect(items[0].match).toBe('ai_estimate');
    expect(items[0].nutrients.kcal).toBe(1800); // 900 kcal/100 g cap × 2
    expect(rescaleDraftItem(items[0], 100).nutrients.kcal).toBe(900);
  });

  test('non-food photos log nothing', () => {
    expect(mapAiMealToDraft({ is_food: false, items: [] })).toEqual([]);
  });

  test('slot suggestion follows time of day', () => {
    expect(suggestSlot(new Date('2026-11-26T08:00:00'))).toBe('breakfast');
    expect(suggestSlot(new Date('2026-11-26T21:00:00'))).toBe('dinner');
  });

  test('smarter food search prefers the specific dish', () => {
    expect(matchFoodByQuery('aloo paratha')?.id).toBe('svs_aloo_paratha');
    expect(searchFoods('dal').length).toBeGreaterThan(1);
  });
});

describe('imported report → deterministic summary & plan', () => {
  test('builds statuses, groups and red flags in code', () => {
    const { report: r } = buildReportFromParsed(
      { lab: { name: 'SRL', collected_at: '2026-10-01' }, panels: [{ panel_name: 'Sugar', tests: [{ raw_name: 'Fasting plasma glucose', value: 260, value_text: '260', unit: 'mg/dL', ref_raw: '70-100', confidence: 0.9 }] }], lab_notes: ['Consider HbA1c'] },
      'pdf'
    );
    expect(r.values[0].status).toBe('high');
    expect(r.summary?.red_flags.length).toBeGreaterThan(0);
    expect(r.summary?.followup_tests_from_lab_notes).toContain('HbA1c');
  });

  test('all-normal report says so', () => {
    expect(buildDeterministicSummary(report.values.filter((v) => v.status === 'normal')).snapshot_sentence).toMatch(/within/);
  });

  test('personal plan: targets, safe supplements, tasks', () => {
    const { plan, tasks } = buildPersonalPlan({ report, profile, healthBackground: health, startDate: new Date('2026-11-26') });
    expect(plan.targets.length).toBeGreaterThan(0);
    expect(plan.supplements_to_discuss.some((s) => /niacin|green-tea/i.test(s.name))).toBe(false);
    expect(plan.daily_targets.kcal).toBeGreaterThanOrEqual(1500);
    expect(tasks.some((t) => t.type === 'sleep')).toBe(true);
    expect(focusAreasFor(report.values)).toEqual(expect.arrayContaining(['liver', 'hdl', 'ldl']));
  });

  test('pregnancy removes all supplements', () => {
    const { plan } = buildPersonalPlan({ report, profile: { ...profile, sex: 'F' }, healthBackground: { ...health, pregnant: true } });
    expect(plan.supplements_to_discuss).toEqual([]);
  });

  test('adherence = done / scheduled', () => {
    const tasks = [{ id: 'a', plan_id: 'p', type: 'routine' as const, title: 'x', scheduled_at: '07:00', repeat_rule: 'daily' as const, reminder: false, calendar_sync: false }];
    expect(computeAdherence(tasks, { d1: { a: 'done' }, d2: {} }, ['d1', 'd2'], () => 0)).toBe(50);
  });
});

describe('reminders', () => {
  test('quiet hours wrap past midnight', () => {
    expect(isInQuietHours('23:00', '22:30', '07:00')).toBe(true);
    expect(isInQuietHours('06:59', '22:30', '07:00')).toBe(true);
    expect(isInQuietHours('12:00', '22:30', '07:00')).toBe(false);
  });

  test('medicines in quiet hours are moved, not dropped; cap applies', () => {
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS, medicineTimes: ['23:30'], dailyCap: 5 };
    const s = buildReminderSchedule({ prefs, wakeTime: '06:30', sleepTime: '22:30', tasks: [] });
    expect(s.find((r) => r.category === 'medicines')?.time).toBe('07:00');
    expect(s.filter((r) => !r.date).length).toBeLessThanOrEqual(5);
  });

  test('disabled = nothing scheduled', () => {
    expect(buildReminderSchedule({ prefs: { ...DEFAULT_NOTIFICATION_PREFS, enabled: false }, wakeTime: '06:30', sleepTime: '22:30', tasks: [] })).toEqual([]);
  });
});

describe('recipes safety', () => {
  const ai = (name: string, ing: string) => ({ ...CURATED_RECIPES[0], id: name, name, source: 'ai' as const, diet_tags: [], ingredients: [{ name: ing, grams: 100 }] });
  test('vegetarian never gets meat, fish or egg', () => {
    expect(recipeExclusionReason(ai('Chicken bowl', 'chicken'), { diet_type: 'vegetarian' }, { allergies: [] })).toBeTruthy();
    expect(recipeExclusionReason(ai('Egg toast', 'egg'), { diet_type: 'vegetarian' }, { allergies: [] })).toBeTruthy();
  });
  test('plant milks/butters are not dairy for vegans', () => {
    expect(recipeExclusionReason(ai('Oats', 'almond milk'), { diet_type: 'vegan' }, { allergies: [] })).toBeNull();
    expect(recipeExclusionReason(ai('Paneer', 'paneer'), { diet_type: 'vegan' }, { allergies: [] })).toBe('contains dairy');
  });
  test('allergies, jain and alcohol are enforced', () => {
    expect(recipeExclusionReason(ai('Satay', 'peanut butter'), { diet_type: 'vegan' }, { allergies: ['peanut'] })).toMatch(/peanut/);
    expect(recipeExclusionReason(ai('Aloo tikki', 'potato'), { diet_type: 'jain' }, { allergies: [] })).toBeTruthy();
    expect(recipeExclusionReason(ai('Wine curry', 'red wine'), { diet_type: 'non_veg' }, { allergies: [] })).toBeTruthy();
  });
  test('ranking favours lab focus and computes nutrition in code', () => {
    const ranked = rankRecipes(CURATED_RECIPES, { focus: ['liver', 'hdl'], profile, health });
    expect(ranked[0].matchedFocus.length).toBeGreaterThan(0);
    expect(ranked[0].per_serving!.kcal).toBeGreaterThan(0);
    expect(ranked.every((r) => r.diet_tags.includes('vegetarian'))).toBe(true);
  });
});

describe('report chat', () => {
  test('dose and medicine-change questions are refused in code', () => {
    expect(guardQuestion('Should I increase my statin dose?').blocked).toBe(true);
    expect(guardQuestion('I have chest pain').blocked).toBe(true);
    expect(guardQuestion('What does ALT mean?').blocked).toBe(false);
  });
  test('offline answers use the user’s own values', () => {
    expect(answerLocally('what about my ALT?', report, null)).toMatch(/ALT \(SGPT\) is 99\.8/);
    expect(answerLocally('hello', undefined, null)).toMatch(/imported/);
  });
});

describe('dates', () => {
  test('calendar helpers', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(monthGrid('2026-11-15')).toHaveLength(42);
    expect(weekdayIndex('2026-11-23')).toBe(0); // Monday
    expect(ageFromDob('2000-11-27', new Date('2026-11-26'))).toBe(25);
  });
});
