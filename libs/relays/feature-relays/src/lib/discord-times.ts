// Times as Discord shows them (<t:seconds:style>), in the reader's own
// language and time zone, and the countdowns of the Weekly tab.

const MINUTE = 60 * 1000;
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * MINUTE],
  ['month', 30 * 24 * 60 * MINUTE],
  ['week', 7 * 24 * 60 * MINUTE],
  ['day', 24 * 60 * MINUTE],
  ['hour', 60 * MINUTE],
  ['minute', MINUTE],
];

const STYLES: Record<string, Intl.DateTimeFormatOptions> = {
  t: { timeStyle: 'short' },
  T: { timeStyle: 'medium' },
  d: { dateStyle: 'short' },
  D: { dateStyle: 'long' },
  f: { dateStyle: 'long', timeStyle: 'short' },
  F: { dateStyle: 'full', timeStyle: 'short' },
};

// "in 12 minutes", "3 hours ago", "now".
export function relativeTime(at: number, now: number): string {
  const diff = at - now;
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return format.format(Math.round(diff / ms), unit);
  }
  return format.format(0, 'second');
}

// A Discord time in one of its styles (t, T, d, D, f, F, R).
export function discordTime(at: number, style: string, now: number): string {
  if (style === 'R') return relativeTime(at, now);
  return new Intl.DateTimeFormat(undefined, STYLES[style] ?? STYLES['f']).format(at);
}

// "Tue 20 Oct, 10:00": a reset or a report's day, short.
export function shortDateTime(at: number): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(at);
}

// "2 d 5 h", "3 h 12 min", "8 min": how long until `at`.
export function countdown(at: number, now: number): string {
  const minutes = Math.max(0, Math.ceil((at - now) / MINUTE));
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;
  if (days) return `${days} d ${hours} h`;
  if (hours) return `${hours} h ${mins} min`;
  return `${mins} min`;
}
