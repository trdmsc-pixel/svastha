import { RESET_8 } from '@/programme/reset8';
import { buildProgrammeReminders, itemToTickFromAction, reminderToItemId } from '@/engine/programmeEngine';
import { addDays, weekdayIndex } from '@/lib/dates';

const P = RESET_8;
// A Sunday (weekday 6) so the weekly Vitamin D item applies.
const SUNDAY = (() => {
  let d = '2026-11-23';
  while (weekdayIndex(d) !== 6) d = addDays(d, 1);
  return d;
})();

describe('reminder id → routine item', () => {
  test('maps per-weekday and plain ids', () => {
    expect(reminderToItemId(P, 'prog-exercise-3')).toBe('exercise');
    expect(reminderToItemId(P, 'prog-vitd-6')).toBe('vitd');
    expect(reminderToItemId(P, 'prog-breakfast')).toBe('breakfast');
    expect(reminderToItemId(P, 'prog-walk-lunch')).toBe('walk-lunch');
  });
  test('non-routine reminders map to nothing', () => {
    expect(reminderToItemId(P, 'prog-weighin')).toBeNull();
    expect(reminderToItemId(P, 'med-0')).toBeNull();
    expect(reminderToItemId(P, 'water-3')).toBeNull();
  });
  test('every tracked reminder carries its item id; mapping agrees', () => {
    const rs = buildProgrammeReminders(P, { thyroid: true, vitaminD: true, b12: true, calcium: true, folic: true });
    for (const r of rs.filter((x) => x.itemId)) expect(reminderToItemId(P, r.id)).toBe(r.itemId);
    expect(rs.find((r) => r.id === 'prog-weighin')?.itemId).toBeUndefined();
  });
});

describe('ticking from a notification action', () => {
  test('"Done ✓" ticks an unticked routine item', () => {
    expect(itemToTickFromAction(P, SUNDAY, 'DONE', 'prog-exercise-6', [])).toBe('exercise');
  });
  test('never un-ticks an already ticked item', () => {
    expect(itemToTickFromAction(P, SUNDAY, 'DONE', 'prog-exercise-6', ['exercise'])).toBeNull();
  });
  test('"Taken" ticks the matching medicine only when it is switched on', () => {
    expect(itemToTickFromAction(P, SUNDAY, 'TAKEN', 'prog-vitd-6', [], { vitaminD: true })).toBe('vitd');
    expect(itemToTickFromAction(P, SUNDAY, 'TAKEN', 'prog-vitd-6', [], {})).toBeNull();
  });
  test('"Taken" cannot tick non-medicine items; snooze/skip/tap tick nothing', () => {
    expect(itemToTickFromAction(P, SUNDAY, 'TAKEN', 'prog-exercise-6', [])).toBeNull();
    for (const a of ['SNOOZE_10', 'SKIP', 'expo.modules.notifications.actions.DEFAULT']) {
      expect(itemToTickFromAction(P, SUNDAY, a, 'prog-exercise-6', [])).toBeNull();
    }
  });
  test('item id hint from notification data is validated', () => {
    expect(itemToTickFromAction(P, SUNDAY, 'DONE', 'whatever', [], {}, 'breakfast')).toBe('breakfast');
    expect(itemToTickFromAction(P, SUNDAY, 'DONE', 'whatever', [], {}, 'not-an-item')).toBeNull();
  });
});

import { applyTimeOverrides, itemsForDate as items, shiftTime, buildProgrammeReminders as reminders } from '@/engine/programmeEngine';
import { hhmmToMinutes } from '@/lib/dates';

describe('time overrides', () => {
  test('override moves an item and re-sorts the day', () => {
    const base = items(P, SUNDAY).map((i) => i.id);
    const moved = items(P, SUNDAY, {}, { exercise: '06:30' });
    expect(moved[0].id).toBe('exercise');
    expect(moved.map((i) => hhmmToMinutes(i.time))).toEqual([...moved.map((i) => hhmmToMinutes(i.time))].sort((a, b) => a - b));
    expect(new Set(moved.map((i) => i.id))).toEqual(new Set(base));
  });
  test('a window keeps its length when moved', () => {
    const ex = applyTimeOverrides(P.routine, { exercise: '18:15' }).find((i) => i.id === 'exercise')!;
    expect(ex.time).toBe('18:15');
    expect(ex.endTime).toBe('19:00'); // 17:15–18:00 shifted by 1 h
  });
  test('invalid overrides are ignored', () => {
    expect(applyTimeOverrides(P.routine, { exercise: '25:99' }).find((i) => i.id === 'exercise')!.time).toBe('17:15');
  });
  test('reminders follow overrides on every weekday', () => {
    const rs = reminders(P, {}, { exercise: '06:30' }).filter((r) => r.itemId === 'exercise');
    expect(rs).toHaveLength(7);
    expect(rs.every((r) => r.time === '06:30')).toBe(true);
  });
  test('shiftTime clamps inside the day', () => {
    expect(shiftTime('23:45', 15)).toBe('23:45');
    expect(shiftTime('00:00', -15)).toBe('00:00');
    expect(shiftTime('08:00', 15)).toBe('08:15');
  });
});
