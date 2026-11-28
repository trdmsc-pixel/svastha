import { useEffect, useMemo, useState } from 'react';
import { RESET_8 } from '@/programme/reset8';
import { Programme } from '@/programme/types';
import { buildComebackReminder, buildProgrammeReminders, buildSundayReminders, dayPosition, dayScore, itemsForDate, nextUp, streak, Flags } from '@/engine/programmeEngine';
import { selectFlags, useProgrammeStore } from '@/store/useProgrammeStore';
import { DateKey, todayKey } from '@/lib/dates';

const PROGRAMMES: Record<string, Programme> = { [RESET_8.id]: RESET_8 };

export function getProgramme(id: string | null | undefined): Programme | null {
  return id ? PROGRAMMES[id] ?? null : null;
}

/** Current HH:mm, refreshed every 30 s so "now / next" moves with the clock. */
export function useClock(): { now: Date; hhmm: string; today: DateKey } {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return { now, hhmm, today: todayKey(now) };
}

export function useProgrammeFlags(): Flags {
  const meds = useProgrammeStore((s) => s.medicines);
  return useMemo(() => selectFlags({ medicines: meds }), [meds]);
}

/** Everything the Today screen needs for the active programme on `date`. */
export function useProgrammeDay(date: DateKey) {
  const id = useProgrammeStore((s) => s.programmeId);
  const startDate = useProgrammeStore((s) => s.startDate);
  const checks = useProgrammeStore((s) => s.checks);
  const overrides = useProgrammeStore((s) => s.timeOverrides);
  const flags = useProgrammeFlags();
  const programme = getProgramme(id);
  const clock = useClock();

  return useMemo(() => {
    if (!programme || !startDate) return null;
    const position = dayPosition(programme, startDate, date);
    const items = itemsForDate(programme, date, flags, overrides);
    const checked = checks[date] ?? [];
    const score = dayScore(programme, date, checked, flags);
    const next = date === clock.today ? nextUp(items, clock.hhmm, checked) : null;
    const currentStreak = streak(programme, startDate, clock.today, checks, flags);
    return { programme, startDate, position, items, checked, score, next, streak: currentStreak, flags, hhmm: date === clock.today ? clock.hhmm : null };
  }, [programme, startDate, date, flags, overrides, checks, clock.today, clock.hhmm]);
}

/**
 * Programme reminders, or [] when no programme is active / reminders are off.
 * Includes the state-aware ones (Sunday recap with last week's real numbers, comeback nudge),
 * so this recomputes when ticks change and when the day rolls over; `ReminderSync` debounces
 * the actual rescheduling.
 */
export function useProgrammeReminders() {
  const id = useProgrammeStore((s) => s.programmeId);
  const on = useProgrammeStore((s) => s.remindersOn);
  const overrides = useProgrammeStore((s) => s.timeOverrides);
  const startDate = useProgrammeStore((s) => s.startDate);
  const checks = useProgrammeStore((s) => s.checks);
  const flags = useProgrammeFlags();
  const { today, hhmm } = useClock();
  // Only the side of 08:15 / 09:05 matters, not every minute — avoids rescheduling every 30 s.
  const phase = `${hhmm < '08:15' ? 'a' : 'b'}${hhmm < '09:05' ? 'a' : 'b'}`;
  return useMemo(() => {
    const p = getProgramme(id);
    if (!p || !on) return [];
    const base = buildProgrammeReminders(p, flags, overrides).filter((r) => r.id !== 'prog-weighin');
    if (!startDate) return base;
    // Representative times on the right side of each cut-off (08:15 Sunday, 09:05 comeback).
    const sundayNow = phase[0] === 'a' ? '08:00' : '09:10';
    const comebackNow = phase[1] === 'a' ? '09:00' : '09:10';
    const comeback = buildComebackReminder(p, startDate, today, comebackNow, checks, flags);
    return [...base, ...buildSundayReminders(p, startDate, today, sundayNow, checks, flags), ...(comeback ? [comeback] : [])];
  }, [id, on, flags, overrides, startDate, checks, today, phase]);
}
