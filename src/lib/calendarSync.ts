import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { PlanTask } from '@/types/domain';
import { tokens } from '@/theme/tokens';

const SVASTHA_CALENDAR_TITLE = 'Svastha';

export async function ensureSvasthaCalendar(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') return null;

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find((c) => c.title === SVASTHA_CALENDAR_TITLE);
  if (existing) return existing.id;

  const defaultSource =
    Platform.OS === 'ios'
      ? (await Calendar.getDefaultCalendarAsync()).source
      : { isLocalAccount: true, name: SVASTHA_CALENDAR_TITLE, type: Calendar.CalendarType.LOCAL };

  return Calendar.createCalendarAsync({
    title: SVASTHA_CALENDAR_TITLE,
    color: tokens.color.accent,
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: defaultSource?.id,
    source: defaultSource,
    name: SVASTHA_CALENDAR_TITLE,
    ownerAccount: 'personal',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

/**
 * Syncs plan tasks & retest date into the phone's dedicated "Svastha" calendar (Section 7.6).
 * Two-way rule: if a previously synced device_event_id was deleted by the user, mark task skipped instead of recreating.
 */
export async function syncPlanTasksToDeviceCalendar(
  tasks: PlanTask[],
  retestDateIso?: string
): Promise<{ syncedCount: number; skippedIds: string[] }> {
  const calendarId = await ensureSvasthaCalendar();
  if (!calendarId) return { syncedCount: 0, skippedIds: [] };

  let syncedCount = 0;
  const skippedIds: string[] = [];
  const today = new Date();

  for (const task of tasks) {
    if (!task.calendar_sync) continue;

    if (task.device_event_id) {
      try {
        await Calendar.getEventAsync(task.device_event_id);
        syncedCount++;
        continue;
      } catch {
        skippedIds.push(task.id);
        continue;
      }
    }

    const [hh, mm] = task.scheduled_at.split(':').map((n) => parseInt(n, 10) || 9);
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hh, mm);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

    await Calendar.createEventAsync(calendarId, {
      title: `Svastha: ${task.title}`,
      startDate,
      endDate,
      notes: 'Synced from Svastha health plan.',
    });
    syncedCount++;
  }

  if (retestDateIso) {
    const start = new Date(`${retestDateIso}T08:00:00`);
    const end = new Date(`${retestDateIso}T09:00:00`);
    await Calendar.createEventAsync(calendarId, {
      title: 'Svastha: Target Lab Retest Day',
      startDate: start,
      endDate: end,
      notes: 'Repeat flagged panels and import new report into Svastha to compare progress.',
    });
  }

  return { syncedCount, skippedIds };
}
