import { RESET_8 } from '@/programme/reset8';
import {
  buildProgrammeReminders,
  dayPosition,
  dayScore,
  itemsForDate,
  menuFor,
  nextUp,
  retestPlan,
  streak,
  targetBand,
  toExpoWeekday,
  weekSummaries,
  weightChange,
  workoutFor,
} from '@/engine/programmeEngine';

const START = '2026-11-30'; // a Monday

describe('8-Week Reset programme engine', () => {
  test('day / week / phase maths', () => {
    expect(dayPosition(RESET_8, START, '2026-11-30')).toMatchObject({ day: 1, week: 1, started: true, finished: false });
    expect(dayPosition(RESET_8, START, '2026-11-29').started).toBe(false);
    expect(dayPosition(RESET_8, START, '2026-12-14').phase.label).toBe('Build'); // day 15 → week 3
    expect(dayPosition(RESET_8, START, '2026-12-28').phase.label).toBe('Strong'); // week 5
    const end = dayPosition(RESET_8, START, '2027-01-24');
    expect(end.day).toBe(56);
    expect(end.finished).toBe(false);
    expect(dayPosition(RESET_8, START, '2027-01-25').finished).toBe(true);
  });

  test('medicine items only appear once prescribed; weekly items only on their day', () => {
    const plain = itemsForDate(RESET_8, START).map((i) => i.id);
    expect(plain).not.toContain('thyroid');
    expect(plain).not.toContain('vitd');
    const withThyroid = itemsForDate(RESET_8, START, { thyroid: true }).map((i) => i.id);
    expect(withThyroid).toContain('thyroid');
    expect(itemsForDate(RESET_8, START, { vitaminD: true }).map((i) => i.id)).not.toContain('vitd'); // Monday
    expect(itemsForDate(RESET_8, '2026-12-06', { vitaminD: true }).map((i) => i.id)).toContain('vitd'); // Sunday
  });

  test('items are sorted by time', () => {
    const times = itemsForDate(RESET_8, START, { thyroid: true, calcium: true }).map((i) => i.time);
    expect([...times].sort()).toEqual(times);
  });

  test('day score and 80% win threshold', () => {
    const tracked = itemsForDate(RESET_8, START).filter((i) => i.track).map((i) => i.id);
    expect(dayScore(RESET_8, START, []).pct).toBe(0);
    const most = tracked.slice(0, Math.ceil(tracked.length * 0.8));
    expect(dayScore(RESET_8, START, most).won).toBe(true);
    expect(dayScore(RESET_8, START, tracked.slice(0, 3)).won).toBe(false);
    expect(dayScore(RESET_8, START, ['school', 'rest']).done).toBe(0); // untracked items never count
  });

  test('next up finds the current window, then the next item', () => {
    const items = itemsForDate(RESET_8, START);
    expect(nextUp(items, '10:15')?.item.id).toBe('bottle1');
    expect(nextUp(items, '10:15')?.isNow).toBe(true);
    const after = nextUp(items, '10:15', ['bottle1']);
    expect(after?.item.id).toBe('fruit');
    expect(after?.minutesAway).toBe(45);
    expect(nextUp(items, '23:45')).toBeNull();
  });

  test('streak counts consecutive won days', () => {
    const tracked = (d: string) => itemsForDate(RESET_8, d).filter((i) => i.track).map((i) => i.id);
    const checks = { '2026-11-30': tracked('2026-11-30'), '2026-12-01': tracked('2026-12-01'), '2026-12-02': [] as string[] };
    expect(streak(RESET_8, START, '2026-12-02', checks)).toBe(2); // today not won yet → counts from yesterday
    expect(streak(RESET_8, START, '2026-12-03', checks)).toBe(0);
  });

  test('week summaries cover 8 weeks and mark future days', () => {
    const w = weekSummaries(RESET_8, START, '2026-12-02', {});
    expect(w).toHaveLength(8);
    expect(w[0].days[3].future).toBe(true);
    expect(w[0].days[2].future).toBe(false);
  });

  test('workout and menu follow the weekday', () => {
    expect(workoutFor(RESET_8, START).type).toBe('strength');
    expect(workoutFor(RESET_8, '2026-12-01').type).toBe('yoga');
    expect(workoutFor(RESET_8, '2026-12-06').moves).toHaveLength(0);
    expect(menuFor(RESET_8, START).breakfast.title).toMatch(/chilla/i);
  });

  test('weight change and safe-pace band', () => {
    expect(weightChange([])).toBeNull();
    const c = weightChange([
      { date: '2026-12-06', weightKg: 69.2, waistCm: 92 },
      { date: '2026-11-29', weightKg: 70.4, waistCm: 94 },
    ]);
    expect(c).toEqual({ startKg: 70.4, latestKg: 69.2, changeKg: -1.2, waistChangeCm: -2 });
    expect(targetBand(70, 8)).toEqual({ min: 64, max: 66 });
  });

  test('retest plan dates', () => {
    const r = retestPlan(START, '2026-12-05');
    expect(r.find((x) => x.id === 'tsh')?.date).toBe('2027-01-23');
    expect(retestPlan(START).find((x) => x.id === 'tsh')?.date).toBeNull();
  });

  test('reminders: weekday mapping, per-weekday workout copy, medicine gating', () => {
    expect(toExpoWeekday(0)).toBe(2); // Monday
    expect(toExpoWeekday(6)).toBe(1); // Sunday
    const base = buildProgrammeReminders(RESET_8);
    expect(base.some((r) => r.category === 'medicines')).toBe(false);
    const ex = base.filter((r) => r.id.startsWith('prog-exercise-'));
    expect(ex).toHaveLength(7);
    expect(ex.find((r) => r.weekday === 1)?.body).toMatch(/Rest day/);
    expect(base.find((r) => r.id === 'prog-weighin')?.weekday).toBe(1);
    const med = buildProgrammeReminders(RESET_8, { thyroid: true, vitaminD: true });
    expect(med.find((r) => r.id === 'prog-thyroid')?.time).toBe('08:00');
    expect(med.find((r) => r.id === 'prog-wake')).toBeUndefined(); // merged into the thyroid alert
    expect(med.find((r) => r.id === 'prog-vitd-6')?.weekday).toBe(1);
    // iOS keeps at most 64 pending local notifications
    expect(buildProgrammeReminders(RESET_8, { thyroid: true, vitaminD: true, calcium: true, folic: true, b12: true }).length).toBeLessThan(40);
  });
});
