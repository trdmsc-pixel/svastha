import { useEffect, useMemo, useState } from 'react';
import { RESET_8 } from '@/programme/reset8';
import { Programme } from '@/programme/types';
import { buildProgrammeReminders, dayPosition, dayScore, itemsForDate, nextUp, streak, Flags } from '@/engine/programmeEngine';
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
  const flags = useProgrammeFlags();
  const programme = getProgramme(id);
  const clock = useClock();

  return useMemo(() => {
    if (!programme || !startDate) return null;
    const position = dayPosition(programme, startDate, date);
    const items = itemsForDate(programme, date, flags);
    const checked = checks[date] ?? [];
    const score = dayScore(programme, date, checked, flags);
    const next = date === clock.today ? nextUp(items, clock.hhmm, checked) : null;
    const currentStreak = streak(programme, startDate, clock.today, checks, flags);
    return { programme, startDate, position, items, checked, score, next, streak: currentStreak, flags, hhmm: date === clock.today ? clock.hhmm : null };
  }, [programme, startDate, date, flags, checks, clock.today, clock.hhmm]);
}

/** Programme reminders, or [] when no programme is active / reminders are off. */
export function useProgrammeReminders() {
  const id = useProgrammeStore((s) => s.programmeId);
  const on = useProgrammeStore((s) => s.remindersOn);
  const flags = useProgrammeFlags();
  return useMemo(() => {
    const p = getProgramme(id);
    return p && on ? buildProgrammeReminders(p, flags) : [];
  }, [id, on, flags]);
}
