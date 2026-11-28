/**
 * Deterministic programme engine (CLAUDE.md rule 2): day/phase maths, today's checklist,
 * scores, streaks, weight change, retest dates and the notification schedule.
 * No React, no I/O — fully unit tested in tests/programme.test.ts.
 */
import { ConditionFlag, MenuDay, Move, Phase, Programme, RoutineItem, Weekday, WorkoutType } from '@/programme/types';
import { ScheduledReminder } from '@/engine/reminderSchedule';
import { addDays, DateKey, diffDays, hhmmToMinutes, minutesToHHmm, weekdayIndex } from '@/lib/dates';

export type Flags = Partial<Record<ConditionFlag, boolean>>;

/** Per-item start-time overrides chosen by the user (item id → 'HH:mm'). */
export type TimeOverrides = Record<string, string>;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Applies the user's time overrides to routine items. A window (`endTime`) moves with its
 * start so its length is kept. Invalid override strings are ignored.
 */
export function applyTimeOverrides(items: RoutineItem[], overrides: TimeOverrides = {}): RoutineItem[] {
  return items.map((it) => {
    const t = overrides[it.id];
    if (!t || !HHMM.test(t) || t === it.time) return it;
    const shift = hhmmToMinutes(t) - hhmmToMinutes(it.time);
    return { ...it, time: t, endTime: it.endTime ? minutesToHHmm(hhmmToMinutes(it.endTime) + shift) : undefined };
  });
}

/** Shifts an HH:mm by `deltaMin`, clamped to the same day (00:00–23:45). */
export function shiftTime(hhmm: string, deltaMin: number): string {
  return minutesToHHmm(Math.min(23 * 60 + 45, Math.max(0, hhmmToMinutes(hhmm) + deltaMin)));
}

export interface DayPosition {
  /** 1-based day of the programme; < 1 before start, > total after the end. */
  day: number;
  totalDays: number;
  /** 1-based week, clamped to 1…weeks. */
  week: number;
  phase: Phase;
  started: boolean;
  finished: boolean;
}

export function dayPosition(p: Programme, startDate: DateKey, date: DateKey): DayPosition {
  const totalDays = p.weeks * 7;
  const day = diffDays(startDate, date) + 1;
  const week = Math.min(p.weeks, Math.max(1, Math.ceil(day / 7)));
  return { day, totalDays, week, phase: phaseForWeek(p, week), started: day >= 1, finished: day > totalDays };
}

export function phaseForWeek(p: Programme, week: number): Phase {
  return p.phases.find((ph) => week >= ph.fromWeek && week <= ph.toWeek) ?? p.phases[p.phases.length - 1];
}

/** Routine items that apply on `date`, respecting weekday rules and prescribed-medicine flags. */
export function itemsForDate(p: Programme, date: DateKey, flags: Flags = {}, overrides: TimeOverrides = {}): RoutineItem[] {
  const wd = weekdayIndex(date) as Weekday;
  return applyTimeOverrides(p.routine, overrides)
    .filter((it) => (it.requires ? !!flags[it.requires] : true))
    .filter((it) => (it.days ? it.days.includes(wd) : true))
    .sort((a, b) => hhmmToMinutes(a.time) - hhmmToMinutes(b.time));
}

export interface DayScore {
  done: number;
  total: number;
  pct: number; // 0…1
  won: boolean;
}

export function dayScore(p: Programme, date: DateKey, checked: readonly string[] | undefined, flags: Flags = {}): DayScore {
  const tracked = itemsForDate(p, date, flags).filter((i) => i.track);
  const set = new Set(checked ?? []);
  const done = tracked.filter((i) => set.has(i.id)).length;
  const total = tracked.length;
  const pct = total === 0 ? 0 : done / total;
  return { done, total, pct, won: total > 0 && pct >= p.winThreshold };
}

/** The item happening now (inside its window) or the next one coming up today. */
export function nextUp(items: RoutineItem[], nowHHmm: string, checked: readonly string[] = []): { item: RoutineItem; isNow: boolean; minutesAway: number } | null {
  const now = hhmmToMinutes(nowHHmm);
  const done = new Set(checked);
  for (const it of items) {
    if (done.has(it.id)) continue;
    const start = hhmmToMinutes(it.time);
    const end = it.endTime ? hhmmToMinutes(it.endTime) : start + 30;
    if (now >= start && now < end) return { item: it, isNow: true, minutesAway: 0 };
    if (start > now) return { item: it, isNow: false, minutesAway: start - now };
  }
  return null;
}

/** Consecutive "won" days ending today (today counts only once it is won). */
export function streak(p: Programme, startDate: DateKey, today: DateKey, checks: Record<DateKey, string[]>, flags: Flags = {}): number {
  let n = 0;
  let d = today;
  if (!dayScore(p, d, checks[d], flags).won) d = addDays(d, -1);
  while (diffDays(startDate, d) >= 0 && dayScore(p, d, checks[d], flags).won) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export interface WeekSummary {
  week: number;
  days: Array<{ date: DateKey; pct: number; won: boolean; future: boolean }>;
  wonDays: number;
}

export function weekSummaries(p: Programme, startDate: DateKey, today: DateKey, checks: Record<DateKey, string[]>, flags: Flags = {}): WeekSummary[] {
  return Array.from({ length: p.weeks }, (_, w) => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(startDate, w * 7 + i);
      const future = diffDays(today, date) > 0;
      const s = future ? { pct: 0, won: false } : dayScore(p, date, checks[date], flags);
      return { date, pct: s.pct, won: s.won, future };
    });
    return { week: w + 1, days, wonDays: days.filter((d) => d.won).length };
  });
}

export function workoutFor(p: Programme, date: DateKey): { type: WorkoutType; moves: Move[] } {
  const type = p.workoutByWeekday[weekdayIndex(date) as Weekday];
  return { type, moves: type === 'strength' ? p.strength : type === 'yoga' ? p.yoga : [] };
}

export function menuFor(p: Programme, date: DateKey): MenuDay {
  return p.menu[weekdayIndex(date) as Weekday];
}

export interface WeighIn {
  date: DateKey;
  weightKg: number;
  waistCm?: number;
  energy?: number; // 1–10
}

export function weightChange(weighIns: WeighIn[]): { startKg: number; latestKg: number; changeKg: number; waistChangeCm: number | null } | null {
  if (weighIns.length === 0) return null;
  const sorted = [...weighIns].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const firstWaist = sorted.find((w) => w.waistCm != null)?.waistCm;
  const lastWaist = [...sorted].reverse().find((w) => w.waistCm != null)?.waistCm;
  return {
    startKg: first.weightKg,
    latestKg: last.weightKg,
    changeKg: Math.round((last.weightKg - first.weightKg) * 10) / 10,
    waistChangeCm: firstWaist != null && lastWaist != null ? Math.round((lastWaist - firstWaist) * 10) / 10 : null,
  };
}

/** Safe-pace guide band: 0.5–0.75 kg a week. */
export function targetBand(startKg: number, weeksIn: number): { min: number; max: number } {
  return { min: Math.round((startKg - 0.75 * weeksIn) * 10) / 10, max: Math.round((startKg - 0.5 * weeksIn) * 10) / 10 };
}

export interface RetestItem {
  id: string;
  label: string;
  date: DateKey | null;
  note: string;
}

/** Retest windows from the plan: TSH 6–8 wk after starting the tablet, B12 / LFT ~10 wk, Vit D after a 12-week course. */
export function retestPlan(programmeStart: DateKey, thyroidStart?: DateKey | null, vitDStart?: DateKey | null): RetestItem[] {
  return [
    { id: 'tsh', label: 'TSH + Free T4', date: thyroidStart ? addDays(thyroidStart, 49) : null, note: thyroidStart ? '7 weeks after starting the thyroid tablet' : 'Set once the thyroid tablet starts' },
    { id: 'b12', label: 'Vitamin B12', date: addDays(programmeStart, 70), note: 'About 10 weeks after starting treatment' },
    { id: 'lft', label: 'Liver test (LFT)', date: addDays(programmeStart, 70), note: 'About 10 weeks' },
    { id: 'vitd', label: 'Vitamin D', date: addDays(vitDStart ?? programmeStart, 84), note: 'After the 12-week course' },
  ];
}

/** Expo weekly trigger weekday: 1 = Sunday … 7 = Saturday. */
export function toExpoWeekday(wd: Weekday): number {
  return ((wd + 1) % 7) + 1;
}

/**
 * Maps a scheduled reminder id back to its routine item: `prog-exercise-3` → `exercise`,
 * `prog-vitd-6` → `vitd`, `prog-walk-lunch` → `walk-lunch`. Returns null for reminders that
 * aren't routine items (e.g. the Sunday check-in or the user's own medicine times).
 */
export function reminderToItemId(p: Programme, reminderId: string): string | null {
  if (!reminderId.startsWith('prog-')) return null;
  const rest = reminderId.slice(5);
  const ids = new Set(p.routine.map((r) => r.id));
  if (ids.has(rest)) return rest;
  const m = /^(.+)-([0-6])$/.exec(rest);
  return m && ids.has(m[1]) ? m[1] : null;
}

export const NOTIFICATION_ACTIONS = { done: 'DONE', taken: 'TAKEN', snooze: 'SNOOZE_10', skip: 'SKIP' } as const;

/**
 * Decides which item (if any) a notification action should tick for `date`.
 * Only "Done ✓" / "Taken" tick; only items that apply that day, are tracked, and aren't
 * already ticked (so a repeated or replayed response can never un-tick anything).
 */
export function itemToTickFromAction(
  p: Programme,
  date: DateKey,
  actionId: string,
  reminderId: string,
  checked: readonly string[] | undefined,
  flags: Flags = {},
  itemIdHint?: string | null
): string | null {
  if (actionId !== NOTIFICATION_ACTIONS.done && actionId !== NOTIFICATION_ACTIONS.taken) return null;
  const itemId = itemIdHint && p.routine.some((r) => r.id === itemIdHint) ? itemIdHint : reminderToItemId(p, reminderId);
  if (!itemId) return null;
  const item = itemsForDate(p, date, flags).find((i) => i.id === itemId);
  if (!item || !item.track) return null;
  // "Taken" is only meaningful for medicines; "Done" for everything else.
  if (actionId === NOTIFICATION_ACTIONS.taken && item.kind !== 'medicine') return null;
  if ((checked ?? []).includes(itemId)) return null;
  return itemId;
}

const WORKOUT_COPY: Record<WorkoutType, string> = {
  strength: 'Walk first, then 15 min strength: squats, wall push-ups, bridges.',
  yoga: 'Walk first, then 15 min yoga to finish calm.',
  rest: 'Rest day. A relaxed family walk is perfect.',
};

/**
 * Notification schedule for the programme. Routine reminders repeat daily (or weekly when an
 * item has `days`); the exercise reminder is split per weekday so the copy matches the workout;
 * a Sunday weigh-in reminder is added. Medicine items only appear when their flag is on.
 */
export function buildProgrammeReminders(p: Programme, flags: Flags = {}, overrides: TimeOverrides = {}): ScheduledReminder[] {
  const out: ScheduledReminder[] = [];
  for (const it of applyTimeOverrides(p.routine, overrides)) {
    if (!it.remind) continue;
    if (it.requires && !flags[it.requires]) continue;
    // The thyroid reminder already wakes her at 08:00 with the same instruction.
    if (it.id === 'wake' && flags.thyroid) continue;
    const category = it.kind === 'medicine' ? 'medicines' : it.kind === 'meal' ? 'meals' : it.kind === 'water' ? 'water' : 'routine';
    const title = it.reminderTitle ?? `${it.emoji} ${it.title}`;
    const body = it.reminderBody ?? it.detail ?? it.title;
    if (it.id === 'exercise') {
      ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).forEach((wd) =>
        out.push({ id: `prog-exercise-${wd}`, category, title, body: WORKOUT_COPY[p.workoutByWeekday[wd]], time: it.time, weekday: toExpoWeekday(wd), itemId: it.track ? it.id : undefined })
      );
    } else if (it.days) {
      it.days.forEach((wd) => out.push({ id: `prog-${it.id}-${wd}`, category, title, body, time: it.time, weekday: toExpoWeekday(wd), itemId: it.track ? it.id : undefined }));
    } else {
      out.push({ id: `prog-${it.id}`, category, title, body, time: it.time, itemId: it.track ? it.id : undefined });
    }
  }
  out.push({ id: 'prog-weighin', category: 'routine', title: 'Sunday check 📏', body: 'Weigh in before tea, measure your waist, and see your week.', time: '08:15', weekday: toExpoWeekday(6) });
  return out.sort((a, b) => hhmmToMinutes(a.time) - hhmmToMinutes(b.time));
}

/* ───────────── Dynamic, state-aware reminders (rebuilt whenever ticks change) ───────────── */

/** Next Sunday on/after `today` whose `atHHmm` hasn't passed yet. */
export function nextSundayFire(today: DateKey, nowHHmm: string, atHHmm = '08:15'): DateKey {
  const wd = weekdayIndex(today);
  if (wd === 6 && hhmmToMinutes(nowHHmm) < hhmmToMinutes(atHHmm)) return today;
  return addDays(today, wd === 6 ? 7 : 6 - wd);
}

export interface WeekRecap {
  wonDays: number;
  countedDays: number;
  streak: number;
}

/** Recap of the 7 days before `fireDate` (only days on/after the programme start, never the future). */
export function weekRecap(p: Programme, startDate: DateKey, fireDate: DateKey, today: DateKey, checks: Record<DateKey, string[]>, flags: Flags = {}): WeekRecap {
  let won = 0;
  let counted = 0;
  for (let i = 7; i >= 1; i--) {
    const d = addDays(fireDate, -i);
    if (diffDays(startDate, d) < 0 || diffDays(today, d) > 0) continue;
    counted++;
    if (dayScore(p, d, checks[d], flags).won) won++;
  }
  const lastDay = addDays(fireDate, -1);
  const upTo = diffDays(today, lastDay) > 0 ? today : lastDay;
  return { wonDays: won, countedDays: counted, streak: diffDays(startDate, upTo) < 0 ? 0 : streak(p, startDate, upTo, checks, flags) };
}

/** Warm, never-shaming copy for the Sunday check-in. Deterministic. */
export function sundaySummaryCopy(r: WeekRecap): { title: string; body: string } {
  const tail = 'Weigh in before tea.';
  if (r.countedDays === 0) return { title: 'Sunday check 📏', body: 'Weigh in before tea, measure your waist, and see your week.' };
  const streakPart = r.streak >= 2 ? `, 🔥 ${r.streak}-day streak` : '';
  if (r.wonDays === 0) {
    return { title: 'Sunday check 📏', body: `New week, fresh sheet. Pick one habit to win today. ${tail}` };
  }
  const cheer = r.wonDays >= Math.max(5, r.countedDays - 1) ? ' Brilliant week!' : r.wonDays * 2 >= r.countedDays ? ' Steady progress.' : ' Every tick counts.';
  return { title: 'Your week in ticks 📏', body: `Last week: ${r.wonDays}/${r.countedDays} winning days${streakPart}.${cheer} ${tail}` };
}

/**
 * Sunday check-in as dated reminders: the next Sunday carries last week's real numbers; the
 * following Sundays (up to `extraWeeks`) keep gentle static copy as a fallback in case the app
 * isn't opened. Rebuilding the schedule (on every tick change) refreshes the numbers.
 */
export function buildSundayReminders(
  p: Programme,
  startDate: DateKey,
  today: DateKey,
  nowHHmm: string,
  checks: Record<DateKey, string[]>,
  flags: Flags = {},
  extraWeeks = 3
): ScheduledReminder[] {
  const end = addDays(startDate, p.weeks * 7);
  const first = nextSundayFire(today, nowHHmm);
  const out: ScheduledReminder[] = [];
  for (let w = 0; w <= extraWeeks; w++) {
    const date = addDays(first, w * 7);
    if (diffDays(end, date) > 0) break; // allow the Sunday right after the last week
    const copy = w === 0 ? sundaySummaryCopy(weekRecap(p, startDate, date, today, checks, flags)) : { title: 'Sunday check 📏', body: 'Weigh in before tea, measure your waist, and see your week.' };
    out.push({ id: `prog-weighin-${date}`, category: 'routine', title: copy.title, body: copy.body, time: '08:15', date });
  }
  return out;
}

export const COMEBACK_TIME = '09:05';
export const COMEBACK_COPY = { title: 'New day, fresh sheet 🌱', body: 'Just breakfast + water to start.' };

/**
 * Gentle comeback nudge: a one-off at 09:05 on the morning after a day that scored under 50%.
 * Before 09:05 it looks at yesterday (for today); after 09:05 it looks at today-so-far (for
 * tomorrow) so it is already queued even if the app isn't opened next morning — and it is
 * removed automatically once more ticks lift the day over 50%. At most one per date (id).
 */
export function buildComebackReminder(
  p: Programme,
  startDate: DateKey,
  today: DateKey,
  nowHHmm: string,
  checks: Record<DateKey, string[]>,
  flags: Flags = {}
): ScheduledReminder | null {
  const beforeNudge = hhmmToMinutes(nowHHmm) < hhmmToMinutes(COMEBACK_TIME);
  const scored = beforeNudge ? addDays(today, -1) : today;
  const fireDate = beforeNudge ? today : addDays(today, 1);
  if (diffDays(startDate, scored) < 0) return null; // nothing to come back from yet
  if (diffDays(fireDate, addDays(startDate, p.weeks * 7 - 1)) < 0) return null; // programme over
  const s = dayScore(p, scored, checks[scored], flags);
  if (s.total === 0 || s.pct >= 0.5) return null;
  // Already started the fire day (e.g. ticked breakfast early)? Don't nag.
  if ((checks[fireDate] ?? []).length >= 2) return null;
  return { id: `prog-comeback-${fireDate}`, category: 'routine', title: COMEBACK_COPY.title, body: COMEBACK_COPY.body, time: COMEBACK_TIME, date: fireDate };
}
