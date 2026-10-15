import { ScheduledOpening, Venue } from '@everise/core/api-types';

type Opening = Pick<Venue, 'opensAt' | 'closesAt'>;

const WEEK_OF_MONTH: Record<number, string> = { 1: 'First', 2: 'Second', 3: 'Third', 4: 'Fourth', 5: 'Fifth' };

// When a venue is open, in the visitor's own time and words: "Open now,
// until 22:00", "Opens today at 19:00", "Opens tomorrow at 19:00",
// "Opens Friday at 19:00", or a week or more away "Opens Sunday 1
// November at 19:00".
export function openingText(venue: Opening, now: number, locale?: string) {
  const opens = new Date(venue.opensAt);
  const closes = new Date(venue.closesAt);
  if (opens.getTime() <= now) return `Open now, until ${clock(closes, locale)}`;
  return `Opens ${dayOf(opens, now, locale)} at ${clock(opens, locale)}`;
}

// Whether the venue's opening is going on at `now`.
export function isOpen(venue: Opening, now: number) {
  return Date.parse(venue.opensAt) <= now && now < Date.parse(venue.closesAt);
}

// How a regular opening comes back, on its weekday in the visitor's time:
// "Every Friday", "Every 2 weeks on Friday", "First Sunday of the month",
// "Last Saturday of the month".
export function repeatText(opening: ScheduledOpening, locale?: string) {
  const weekday = new Date(opening.opensAt).toLocaleDateString(locale, { weekday: 'long' });
  const { repeat } = opening;
  if (repeat.every === 'weeks') {
    return repeat.weeks === 1 ? `Every ${weekday}` : `Every ${repeat.weeks} weeks on ${weekday}`;
  }
  const which = repeat.week === -1 ? 'Last' : WEEK_OF_MONTH[repeat.week];
  return which ? `${which} ${weekday} of the month` : `Once a month on ${weekday}`;
}

// An opening's hours in the visitor's time: "20:00 – 01:59".
export function hoursText(opening: Opening, locale?: string) {
  return `${clock(new Date(opening.opensAt), locale)} – ${clock(new Date(opening.closesAt), locale)}`;
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
