import { useMemo } from 'react';
import { HealthPlan, PlanTask } from '@/types/domain';
import { DayLog, EMPTY_DAY, useAppStore } from '@/store/useAppStore';
import { calculateDailyNutritionTargets, calculateDailyWaterMl } from '@/engine/nutritionEngine';
import { computeAdherence, goalFromProfile, tasksForWeekday } from '@/engine/planBuilder';
import { buildReminderSchedule } from '@/engine/reminderSchedule';
import { buildInboxItems } from '@/engine/insights';
import { addDays, ageFromDob, todayKey, weekdayIndex } from '@/lib/dates';
import { sumNutrients } from '@/engine/mealAnalysis';

export function useDayLog(date?: string): DayLog {
  const selected = useAppStore((s) => s.selectedDate);
  const key = date ?? selected;
  return useAppStore((s) => s.days[key]) ?? EMPTY_DAY;
}

/** Daily targets from the active plan, or computed from the profile when there is no plan yet. */
export function useDailyTargets(): HealthPlan['daily_targets'] {
  const plan = useAppStore((s) => s.activePlan);
  const profile = useAppStore((s) => s.profile);
  const health = useAppStore((s) => s.healthBackground);
  return useMemo(() => {
    if (plan) return plan.daily_targets;
    const n = calculateDailyNutritionTargets({
      sex: profile.sex,
      ageYears: ageFromDob(profile.dob) ?? 30,
      heightCm: profile.height_cm || 165,
      weightKg: profile.weight_kg || 65,
      activityLevel: profile.activity_level,
      goal: goalFromProfile(profile.goals),
      pregnant: health.pregnant,
      underMedicalSupervision: health.under_medical_supervision,
    });
    return { kcal: n.dailyKcal, protein_g: n.proteinG, carbs_g: n.carbsG, fat_g: n.fatG, fibre_g: n.fibreG, water_ml: calculateDailyWaterMl(profile.weight_kg || 65, profile.activity_level), steps: 8000 };
  }, [plan, profile, health]);
}

export function useTasksFor(date?: string): Array<PlanTask & { done: boolean }> {
  const selected = useAppStore((s) => s.selectedDate);
  const key = date ?? selected;
  const tasks = useAppStore((s) => s.tasks);
  const day = useDayLog(key);
  return useMemo(() => tasksForWeekday(tasks, weekdayIndex(key)).map((t) => ({ ...t, done: day.taskStatus[t.id] === 'done' })), [tasks, key, day]);
}

export function useDayTotals(date?: string) {
  const day = useDayLog(date);
  return useMemo(() => sumNutrients(day.meals.map((m) => ({ nutrients: m.total }))), [day]);
}

export function useWeeklyAdherence(): number {
  const tasks = useAppStore((s) => s.tasks);
  const days = useAppStore((s) => s.days);
  return useMemo(() => {
    const t = todayKey();
    const keys = Array.from({ length: 7 }, (_, i) => addDays(t, -i));
    const status: Record<string, Record<string, string>> = {};
    for (const k of keys) status[k] = days[k]?.taskStatus ?? {};
    return computeAdherence(tasks, status, keys, weekdayIndex);
  }, [tasks, days]);
}

export function useReminderSchedule() {
  const prefs = useAppStore((s) => s.notificationPrefs);
  const profile = useAppStore((s) => s.profile);
  const tasks = useAppStore((s) => s.tasks);
  const plan = useAppStore((s) => s.activePlan);
  return useMemo(
    () => buildReminderSchedule({ prefs, wakeTime: profile.wake_time, sleepTime: profile.sleep_time, tasks, retestDate: plan?.retest_date, waterGoalMl: plan?.daily_targets.water_ml }),
    [prefs, profile.wake_time, profile.sleep_time, tasks, plan]
  );
}

/** In-app notification inbox for TODAY with real unread counts. */
export function useInbox() {
  const t = todayKey();
  const day = useAppStore((s) => s.days[t]) ?? EMPTY_DAY;
  const tasks = useAppStore((s) => s.tasks);
  const plan = useAppStore((s) => s.activePlan);
  const reports = useAppStore((s) => s.reports);
  const profile = useAppStore((s) => s.profile);
  const prefs = useAppStore((s) => s.notificationPrefs);
  const readIds = useAppStore((s) => s.readInboxIds);
  const schedule = useReminderSchedule();
  const items = useMemo(
    () =>
      buildInboxItems({
        now: new Date(),
        todayKey: t,
        meals: day.meals,
        waterMl: day.waterMl,
        taskStatus: day.taskStatus,
        tasks: tasksForWeekday(tasks, weekdayIndex(t)),
        plan,
        reports,
        schedule,
        wakeTime: profile.wake_time,
        sleepTime: profile.sleep_time,
        categories: prefs.categories,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, day, tasks, plan, reports, schedule, profile.wake_time, profile.sleep_time, prefs.categories]
  );
  const read = new Set(readIds);
  const unread = items.filter((i) => !read.has(i.id)).length;
  return { items, unread, isRead: (id: string) => read.has(id) };
}
