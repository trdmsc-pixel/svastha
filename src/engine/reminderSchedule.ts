import { MealSlot, NotificationPrefs, PlanTask, ReminderCategory } from '@/types/domain';
import { hhmmToMinutes, minutesToHHmm } from '@/lib/dates';

export interface ScheduledReminder {
  id: string;
  category: ReminderCategory;
  title: string;
  body: string;
  time: string; // HH:mm local, repeats daily unless `date` is set
  date?: string; // YYYY-MM-DD for one-off reminders (retest)
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: true,
  categories: { water: true, meals: true, medicines: true, routine: true, retest: true, insights: true },
  quietStart: '22:30',
  quietEnd: '07:00',
  dailyCap: 12,
  waterIntervalMin: 120,
  mealTimes: { breakfast: '08:30', lunch: '13:15', snack: '17:00', dinner: '20:30' },
  medicineTimes: [],
  weeklySummary: true,
  sound: true,
};

/** True when `hhmm` falls inside quiet hours (handles windows that wrap past midnight). */
export function isInQuietHours(hhmm: string, quietStart: string, quietEnd: string): boolean {
  const t = hhmmToMinutes(hhmm);
  const s = hhmmToMinutes(quietStart);
  const e = hhmmToMinutes(quietEnd);
  if (s === e) return false;
  return s < e ? t >= s && t < e : t >= s || t < e;
}

const PRIORITY: Record<ReminderCategory, number> = { medicines: 0, retest: 1, routine: 2, meals: 3, water: 4, insights: 5 };

const MEAL_COPY: Record<MealSlot, string> = {
  breakfast: 'Log breakfast — a protein-rich start keeps you steady till lunch.',
  lunch: 'Time for lunch. Snap your plate to log it in seconds.',
  snack: 'Snack time? Fruit, sprouts or makhana fit your plan.',
  dinner: 'Log dinner — try to finish 2–3 hours before bed.',
};

export interface ReminderInput {
  prefs: NotificationPrefs;
  wakeTime: string;
  sleepTime: string;
  tasks: PlanTask[];
  retestDate?: string;
  waterGoalMl?: number;
  todayKey?: string;
}

/**
 * Builds the full daily reminder schedule deterministically:
 * water every N minutes between wake and sleep, meal nudges, medicine times, plan-task
 * reminders and a one-off retest reminder (3 days before + on the day). Anything inside
 * quiet hours is dropped (medicines are moved to the edge of quiet hours instead), then the
 * list is capped by priority so the user never gets more than `dailyCap` a day.
 */
export function buildReminderSchedule(input: ReminderInput): ScheduledReminder[] {
  const { prefs } = input;
  if (!prefs.enabled) return [];
  const out: ScheduledReminder[] = [];
  const wake = hhmmToMinutes(input.wakeTime);
  let sleep = hhmmToMinutes(input.sleepTime);
  if (sleep <= wake) sleep += 1440;

  if (prefs.categories.water) {
    const interval = Math.max(45, prefs.waterIntervalMin);
    const slots: number[] = [];
    for (let t = wake + 60; t <= sleep - 60; t += interval) slots.push(t);
    const perGlass = input.waterGoalMl && slots.length > 0 ? Math.round(input.waterGoalMl / slots.length / 50) * 50 : 250;
    slots.forEach((t, i) =>
      out.push({ id: `water-${i}`, category: 'water', title: 'Hydration check 💧', body: `Have ~${Math.max(150, perGlass)} ml of water to stay on track.`, time: minutesToHHmm(t) })
    );
  }

  if (prefs.categories.meals) {
    (Object.keys(prefs.mealTimes) as MealSlot[]).forEach((slot) =>
      out.push({ id: `meal-${slot}`, category: 'meals', title: `${slot[0].toUpperCase()}${slot.slice(1)} reminder`, body: MEAL_COPY[slot], time: prefs.mealTimes[slot] })
    );
  }

  if (prefs.categories.medicines) {
    prefs.medicineTimes.forEach((time, i) =>
      out.push({ id: `med-${i}`, category: 'medicines', title: 'Medicine reminder', body: 'Time for your prescribed medicine. Tap Taken, Snooze or Skip.', time })
    );
    input.tasks
      .filter((t) => t.type === 'med' && t.reminder)
      .forEach((t) => out.push({ id: `task-${t.id}`, category: 'medicines', title: 'Medicine reminder', body: t.title, time: t.scheduled_at }));
  }

  if (prefs.categories.routine) {
    input.tasks
      .filter((t) => t.reminder && t.type !== 'med')
      .forEach((t) => out.push({ id: `task-${t.id}`, category: 'routine', title: 'Plan task', body: t.title, time: t.scheduled_at }));
  }

  if (prefs.categories.retest && input.retestDate) {
    out.push({ id: 'retest-day', category: 'retest', title: 'Retest day 🎯', body: 'Repeat your flagged tests today, then import the new report to compare progress.', time: '08:00', date: input.retestDate });
    const d = new Date(`${input.retestDate}T00:00:00`);
    d.setDate(d.getDate() - 3);
    const pre = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({ id: 'retest-soon', category: 'retest', title: 'Retest in 3 days', body: 'Book your lab slot now — fasting tests are best done early morning.', time: '09:00', date: pre });
  }

  const daily = out
    .map((r) => {
      if (!isInQuietHours(r.time, prefs.quietStart, prefs.quietEnd)) return r;
      // Medicines must not be silently dropped: shift to the end of quiet hours.
      return r.category === 'medicines' ? { ...r, time: prefs.quietEnd } : null;
    })
    .filter((r): r is ScheduledReminder => r !== null);

  const oneOff = daily.filter((r) => r.date);
  const repeating = daily
    .filter((r) => !r.date)
    .sort((a, b) => PRIORITY[a.category] - PRIORITY[b.category] || hhmmToMinutes(a.time) - hhmmToMinutes(b.time))
    .slice(0, Math.max(0, prefs.dailyCap))
    .sort((a, b) => hhmmToMinutes(a.time) - hhmmToMinutes(b.time));

  // de-duplicate by id (a med task could appear twice if listed in medicineTimes too)
  const seen = new Set<string>();
  return [...repeating, ...oneOff].filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}
