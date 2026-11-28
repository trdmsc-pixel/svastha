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
