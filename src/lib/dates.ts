/**
 * Pure local-date helpers. All day-keyed data in Svastha uses a local `YYYY-MM-DD` key so
 * the calendar, dashboard, logs and reminders agree on what "a day" is in the user's timezone.
 */

export type DateKey = string; // YYYY-MM-DD (local)

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now);
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export function addMonths(key: DateKey, months: number): DateKey {
  const d = fromDateKey(key);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return toDateKey(d);
}

export function diffDays(a: DateKey, b: DateKey): number {
  const ms = fromDateKey(b).getTime() - fromDateKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function isSameMonth(a: DateKey, b: DateKey): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
export const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Monday = 0 … Sunday = 6 */
export function weekdayIndex(key: DateKey): number {
  return (fromDateKey(key).getDay() + 6) % 7;
}

export function monthTitle(key: DateKey): string {
  const d = fromDateKey(key);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Today, 26 Nov" · "Yesterday, 25 Nov" · "Tue, 1 Dec" */
export function friendlyDayLabel(key: DateKey, now: Date = new Date()): string {
  const d = fromDateKey(key);
  const base = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  const delta = diffDays(todayKey(now), key);
  if (delta === 0) return `Today, ${base}`;
  if (delta === -1) return `Yesterday, ${base}`;
  if (delta === 1) return `Tomorrow, ${base}`;
  return `${WEEKDAYS_SHORT[weekdayIndex(key)]}, ${base}`;
}

export function longDate(key: DateKey): string {
  const d = fromDateKey(key);
  return `${WEEKDAYS_SHORT[weekdayIndex(key)]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** 6×7 grid of day keys for a month view (weeks start Monday). */
export function monthGrid(anyDayInMonth: DateKey): DateKey[] {
  const d = fromDateKey(anyDayInMonth);
  const first = toDateKey(new Date(d.getFullYear(), d.getMonth(), 1));
  const start = addDays(first, -weekdayIndex(first));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** The Monday-start week containing `key`. */
export function weekOf(key: DateKey): DateKey[] {
  const start = addDays(key, -weekdayIndex(key));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function parseHHmm(hhmm: string): { h: number; m: number } {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 };
}

export function hhmmToMinutes(hhmm: string): number {
  const { h, m } = parseHHmm(hhmm);
  return h * 60 + m;
}

export function minutesToHHmm(total: number): string {
  const wrapped = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}

/** "07:15" → "7:15 AM" */
export function formatTime12(hhmm: string): string {
  const { h, m } = parseHHmm(hhmm);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

/** ISO timestamp for a local day key + HH:mm (used when logging to a past/future day). */
export function isoAt(key: DateKey, hhmm: string): string {
  const d = fromDateKey(key);
  const { h, m } = parseHHmm(hhmm);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export function ageFromDob(dob: string, now: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return null;
  const birth = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age--;
  return age;
}

export function greetingFor(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
