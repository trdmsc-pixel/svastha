import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { PlanTask } from '@/types/domain';
import { tokens } from '@/theme/tokens';
import { parseHHmm } from './dates';

const SVASTHA_CALENDAR_TITLE = 'Svastha';
export const calendarSupported = Platform.OS !== 'web';

export interface DeviceEvent {
  id: string;
  title: string;
  start: string; // ISO
  end: string;
  allDay: boolean;
  calendarTitle: string;
  color: string;
}

export async function getCalendarPermission(): Promise<'granted' | 'denied' | 'undetermined' | 'unsupported'> {
  if (!calendarSupported) return 'unsupported';
  const { status } = await Calendar.getCalendarPermissionsAsync();
  return status as 'granted' | 'denied' | 'undetermined';
}

export async function requestCalendarPermission(): Promise<boolean> {
  if (!calendarSupported) return false;
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (Platform.OS === 'ios') {
    // Reminders permission is optional; ignore failures.
    try {
      await Calendar.requestRemindersPermissionsAsync();
    } catch {
      /* noop */
    }
  }
  return status === 'granted';
}

async function ensureSvasthaCalendar(): Promise<string | null> {
  if (!calendarSupported) return null;
  if (!(await requestCalendarPermission())) return null;
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find((c) => c.title === SVASTHA_CALENDAR_TITLE && c.allowsModifications);
  if (existing) return existing.id;

  let source: Calendar.Source | undefined;
  let sourceId: string | undefined;
  if (Platform.OS === 'ios') {
    const def = await Calendar.getDefaultCalendarAsync();
    source = def.source;
    sourceId = def.source?.id;
  } else {
    source = { isLocalAccount: true, name: SVASTHA_CALENDAR_TITLE, type: Calendar.SourceType?.LOCAL ?? 'LOCAL' } as Calendar.Source;
  }
  return Calendar.createCalendarAsync({
    title: SVASTHA_CALENDAR_TITLE,
    color: tokens.color.accent,
    entityType: Calendar.EntityTypes.EVENT,
    sourceId,
    source,
    name: SVASTHA_CALENDAR_TITLE,
    ownerAccount: 'personal',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

/** Reads events from the phone's own calendars (Google / iCloud / Outlook) for a range. */
export async function fetchDeviceEvents(start: Date, end: Date): Promise<DeviceEvent[]> {
  if (!calendarSupported) return [];
  if ((await getCalendarPermission()) !== 'granted') return [];
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const byId = new Map(calendars.map((c) => [c.id, c]));
  if (calendars.length === 0) return [];
  const events = await Calendar.getEventsAsync(calendars.map((c) => c.id), start, end);
  return events
    .map((e) => ({
      id: e.id,
      title: e.title || '(No title)',
      start: new Date(e.startDate).toISOString(),
      end: new Date(e.endDate).toISOString(),
      allDay: !!e.allDay,
      calendarTitle: byId.get(e.calendarId)?.title ?? 'Calendar',
      color: byId.get(e.calendarId)?.color ?? tokens.color.inkMuted,
    }))
    .sort((a, b) => a.start.localeCompare(b.start));
}

async function eventExists(id: string): Promise<boolean> {
  try {
    await Calendar.getEventAsync(id);
    return true;
  } catch {
    return false;
  }
}

export interface SyncResult {
  ok: boolean;
  created: number;
  updated: number;
  removed: number;
  eventIds: Record<string, string>;
  message: string;
}

/**
 * Two-way-safe sync into a dedicated "Svastha" calendar:
 * - Each plan task with calendar sync ON becomes ONE daily-recurring event (no duplicates on
 *   re-sync — existing events are updated in place).
 * - Tasks switched off (or deleted) have their event removed.
 * - The retest date becomes a one-off 1-hour event.
 */
export async function syncPlanToDeviceCalendar(
  tasks: PlanTask[],
  retestDateIso: string | undefined,
  existing: Record<string, string>
): Promise<SyncResult> {
  if (!calendarSupported) {
    return { ok: false, created: 0, updated: 0, removed: 0, eventIds: existing, message: 'Calendar sync works in the iOS and Android app.' };
  }
  const calendarId = await ensureSvasthaCalendar();
  if (!calendarId) {
    return { ok: false, created: 0, updated: 0, removed: 0, eventIds: existing, message: 'Calendar permission is needed. Enable it in your phone’s Settings → Svastha.' };
  }

  const next: Record<string, string> = {};
  let created = 0;
  let updated = 0;
  let removed = 0;
  const today = new Date();

  for (const task of tasks) {
    if (!task.calendar_sync) continue;
    const { h, m } = parseHHmm(task.scheduled_at);
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m);
    const details: Omit<Partial<Calendar.Event>, 'id' | 'organizer'> = {
      title: `Svastha · ${task.title}`,
      startDate,
      endDate: new Date(startDate.getTime() + 30 * 60 * 1000),
      notes: 'From your Svastha health plan. Edit or turn off sync in the app.',
      alarms: task.reminder ? [{ relativeOffset: 0 }] : [],
      recurrenceRule: {
        frequency: Calendar.Frequency.DAILY,
        ...(task.repeat_rule === 'weekdays' ? { daysOfTheWeek: [2, 3, 4, 5, 6].map((d) => ({ dayOfTheWeek: d })) } : {}),
      } as Calendar.RecurrenceRule,
    };
    const prev = existing[task.id];
    if (prev && (await eventExists(prev))) {
      await Calendar.updateEventAsync(prev, details, { futureEvents: true });
      next[task.id] = prev;
      updated++;
    } else {
      next[task.id] = await Calendar.createEventAsync(calendarId, details);
      created++;
    }
  }

  if (retestDateIso) {
    const start = new Date(`${retestDateIso}T08:00:00`);
    const details = {
      title: 'Svastha · Lab retest day 🎯',
      startDate: start,
      endDate: new Date(start.getTime() + 60 * 60 * 1000),
      notes: 'Repeat your flagged tests (fasting if required), then import the new report into Svastha to compare.',
      alarms: [{ relativeOffset: -24 * 60 }],
    };
    const prev = existing.retest;
    if (prev && (await eventExists(prev))) {
      await Calendar.updateEventAsync(prev, details);
      next.retest = prev;
      updated++;
    } else {
      next.retest = await Calendar.createEventAsync(calendarId, details);
      created++;
    }
  }

  for (const [key, id] of Object.entries(existing)) {
    if (next[key]) continue;
    try {
      await Calendar.deleteEventAsync(id, { futureEvents: true });
      removed++;
    } catch {
      /* already gone */
    }
  }

  return {
    ok: true,
    created,
    updated,
    removed,
    eventIds: next,
    message: `Svastha calendar updated · ${created} added, ${updated} updated${removed ? `, ${removed} removed` : ''}.`,
  };
}

export async function removeAllSvasthaEvents(existing: Record<string, string>): Promise<void> {
  if (!calendarSupported) return;
  for (const id of Object.values(existing)) {
    try {
      await Calendar.deleteEventAsync(id, { futureEvents: true });
    } catch {
      /* noop */
    }
  }
}
