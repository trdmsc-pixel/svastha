import { HealthPlan, InboxItem, LabReportRecord, MealLog, MealSlot, PlanTask } from '@/types/domain';
import { diffDays, hhmmToMinutes, isoAt } from '@/lib/dates';
import { ScheduledReminder } from './reminderSchedule';

export interface InboxInput {
  now: Date;
  todayKey: string;
  meals: MealLog[];
  waterMl: number;
  taskStatus: Record<string, string>;
  tasks: PlanTask[];
  plan: HealthPlan | null;
  reports: LabReportRecord[];
  schedule: ScheduledReminder[];
  wakeTime: string;
  sleepTime: string;
  categories: Record<string, boolean>;
}

/**
 * Deterministic, context-aware notification inbox. Every item has a stable id per day so
 * read/unread state survives re-renders and app restarts.
 */
export function buildInboxItems(i: InboxInput): InboxItem[] {
  const items: InboxItem[] = [];
  const nowMin = i.now.getHours() * 60 + i.now.getMinutes();
  const at = (hhmm: string) => isoAt(i.todayKey, hhmm);
  const on = (c: string) => i.categories[c] !== false;

  // Hydration pace — compare against a linear pace between wake and sleep.
  if (on('water') && i.plan) {
    const wake = hhmmToMinutes(i.wakeTime);
    let sleep = hhmmToMinutes(i.sleepTime);
    if (sleep <= wake) sleep += 1440;
    const progress = Math.min(1, Math.max(0, (nowMin - wake) / (sleep - wake)));
    const expected = Math.round(i.plan.daily_targets.water_ml * progress);
    if (progress > 0.15 && i.waterMl < expected - 250) {
      items.push({
        id: `${i.todayKey}-water-pace`,
        category: 'water',
        title: 'You’re behind on water',
        body: `${i.waterMl} ml so far — about ${expected} ml would be on pace right now. Tap to add a glass.`,
        at: i.now.toISOString(),
        route: '/',
      });
    } else if (i.waterMl >= i.plan.daily_targets.water_ml) {
      items.push({ id: `${i.todayKey}-water-done`, category: 'water', title: 'Hydration goal reached 🎉', body: `${i.waterMl} ml today. Great consistency!`, at: i.now.toISOString(), route: '/' });
    }
  }

  // Missed meal logs (slot time has passed and nothing logged for that slot).
  if (on('meals')) {
    const due = i.schedule.filter((s) => s.category === 'meals' && hhmmToMinutes(s.time) + 45 <= nowMin);
    for (const s of due) {
      const slot = s.id.replace('meal-', '') as MealSlot;
      if (!i.meals.some((m) => m.slot === slot)) {
        items.push({ id: `${i.todayKey}-meal-${slot}`, category: 'meals', title: `Did you have ${slot}?`, body: 'Snap a photo or search to log it — it keeps your daily totals accurate.', at: at(s.time), route: '/scan' });
      }
    }
  }

  // Plan tasks that are overdue.
  if (on('routine')) {
    for (const t of i.tasks) {
      if (i.taskStatus[t.id] === 'done') continue;
      if (hhmmToMinutes(t.scheduled_at) + 30 <= nowMin) {
        items.push({ id: `${i.todayKey}-task-${t.id}`, category: t.type === 'med' ? 'medicines' : 'routine', title: 'Plan task pending', body: t.title, at: at(t.scheduled_at), route: '/' });
      }
    }
  }

  // Nutrition insight after 6 PM.
  if (on('insights') && i.plan && nowMin >= 18 * 60) {
    const protein = i.meals.reduce((s, m) => s + m.total.protein_g, 0);
    const target = i.plan.daily_targets.protein_g;
    if (protein < target * 0.6) {
      items.push({ id: `${i.todayKey}-protein`, category: 'insights', title: 'Protein is running low today', body: `${Math.round(protein)} g of ${target} g. Dal, paneer, curd, sprouts or eggs at dinner can close the gap.`, at: at('18:00'), route: '/plan' });
    }
  }

  // Retest countdown.
  if (on('retest') && i.plan) {
    const days = diffDays(i.todayKey, i.plan.retest_date);
    if (days >= 0 && days <= 14) {
      items.push({ id: `retest-${i.plan.retest_date}-${days <= 3 ? 'soon' : 'two-weeks'}`, category: 'retest', title: days === 0 ? 'Retest day is today 🎯' : `Retest in ${days} day${days === 1 ? '' : 's'}`, body: 'Repeat your flagged tests, then import the new report to see your progress.', at: i.now.toISOString(), route: '/calendar' });
    } else if (days > 14) {
      items.push({ id: `retest-countdown-${i.plan.retest_date}`, category: 'retest', title: `Next retest: ${Math.ceil(days / 7)} weeks to go`, body: `Target date ${i.plan.retest_date}. Keep going — consistency moves the numbers.`, at: `${i.plan.start_date}T09:00:00.000Z`, route: '/calendar' });
    }
  }

  // Latest report insight.
  const latest = i.reports[0];
  if (on('insights') && latest?.summary) {
    const { risk, watch } = latest.summary.counts;
    items.push({
      id: `report-${latest.id}`,
      category: 'insights',
      title: latest.summary.red_flags.length > 0 ? '⚠ Report needs prompt attention' : 'Your report summary is ready',
      body: latest.summary.red_flags.length > 0 ? 'Some values crossed safety thresholds. Please contact a doctor soon.' : `${risk} value${risk === 1 ? '' : 's'} need attention and ${watch} to watch. Tap to see what helps.`,
      at: latest.reported_at ?? latest.collected_at,
      route: '/health',
    });
  }

  return items.sort((a, b) => b.at.localeCompare(a.at));
}
