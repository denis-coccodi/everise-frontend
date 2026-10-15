import { Venue } from '@everise/core/api-types';

// When a venue is open, in the visitor's own time and words: "Open now,
// until 22:00", "Opens today at 19:00", "Opens tomorrow at 19:00",
// "Opens Friday at 19:00" (venues listed open within a week).
export function openingText(venue: Pick<Venue, 'opensAt' | 'closesAt'>, now: number, locale?: string) {
  const opens = new Date(venue.opensAt);
  const closes = new Date(venue.closesAt);
  if (opens.getTime() <= now) return `Open now, until ${clock(closes, locale)}`;
  return `Opens ${dayOf(opens, now, locale)} at ${clock(opens, locale)}`;
}

// Whether the venue's opening is going on at `now`.
export function isOpen(venue: Pick<Venue, 'opensAt' | 'closesAt'>, now: number) {
  return Date.parse(venue.opensAt) <= now && now < Date.parse(venue.closesAt);
}

function clock(date: Date, locale?: string) {
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function dayOf(date: Date, now: number, locale?: string) {
  const days = daysBetween(new Date(now), date);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return date.toLocaleDateString(locale, { weekday: 'long' });
}

// Calendar days from `from` to `to`, in the visitor's time zone.
function daysBetween(from: Date, to: Date) {
  const midnight = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((midnight(to) - midnight(from)) / 86_400_000);
}
