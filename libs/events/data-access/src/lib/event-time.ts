import { CommunityEvent } from '@everise/core/api-types';

type Timed = Pick<CommunityEvent, 'startsAt' | 'endsAt'>;

// Whether the event is going on at `now`.
export function isLive(event: Timed, now: number) {
  return Date.parse(event.startsAt) <= now && now < Date.parse(event.endsAt);
}

// When an event is, in the visitor's own time and words: "On now, until
// 23:00", "Starts today at 20:00", "Starts tomorrow at 19:00", "Starts
// Friday at 19:00", or a week or more away "Starts Sunday 1 November at
// 19:00".
export function whenText(event: Timed, now: number, locale?: string) {
  const starts = new Date(event.startsAt);
  if (starts.getTime() <= now) return `On now, until ${clock(new Date(event.endsAt), locale)}`;
  return `Starts ${dayOf(starts, now, locale)} at ${clock(starts, locale)}`;
}

// An event's hours in the visitor's time: "20:00 – 01:00". One that goes
// on for half a day or more names the day it ends: "23:00 – Friday 19:30".
export function hoursText(event: Timed, locale?: string) {
  const starts = new Date(event.startsAt);
  const ends = new Date(event.endsAt);
  const endDay =
    ends.getTime() - starts.getTime() >= LONG_MS ? `${ends.toLocaleDateString(locale, { weekday: 'long' })} ` : '';
  return `${clock(starts, locale)} – ${endDay}${clock(ends, locale)}`;
}

// Past this long, hours alone could read as the same evening.
const LONG_MS = 12 * 3_600_000;

// The day an event starts on, for the list's headings: "Today",
// "Tomorrow", "Saturday 17 October".
export function dayHeading(iso: string, now: number, locale?: string) {
  const date = new Date(iso);
  const days = daysBetween(new Date(now), date);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
}

// The calendar day an event starts on, in the visitor's time zone, to
// group the list by: "2026-10-17".
export function dayKey(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function clock(date: Date, locale?: string) {
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function dayOf(date: Date, now: number, locale?: string) {
  const days = daysBetween(new Date(now), date);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 7) return date.toLocaleDateString(locale, { weekday: 'long' });
  return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
}

// Calendar days from `from` to `to`, in the visitor's time zone.
function daysBetween(from: Date, to: Date) {
  const midnight = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((midnight(to) - midnight(from)) / 86_400_000);
}
