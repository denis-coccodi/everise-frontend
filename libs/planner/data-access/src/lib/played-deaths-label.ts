import type { PullTimeline } from '@everise/core/api-types';
import { pullClock } from './pull-time';

// Hits of one attack up to this long after the first of a time are that
// time: a set of towers in two waves (Enuo's, 5-6 s apart) is one;
// raidwides 10 s apart are two.
const SAME_TIME_MS = 8_000;

// An attack as players can find it without remembering its name: which time
// it was in the pull, in which phase (fights FFLogs splits into phases), and
// when: "Burst (the 2nd time this pull, at 6:46)", "Almagest (at 11:00)".
export function mechanicLabel(timeline: PullTimeline, attack: string, at: number): string {
  const names = new Map(timeline.actions.map((a) => [a.id, a.name]));
  const times: number[] = [];
  let start = -Infinity;
  for (const hit of timeline.damage
    .filter((h) => !h.tick && names.get(h.action) === attack)
    .sort((a, b) => a.at - b.at)) {
    if (hit.at - start > SAME_TIME_MS) {
      times.push(hit.at);
      start = hit.at;
    }
  }
  const nth = times.filter((t) => t <= at + 1_000).length;
  const phase = timeline.phases.filter((p) => p.at <= at).at(-1);
  const where = [
    times.length > 1 && nth > 0 ? `the ${ordinal(nth)} time this pull` : null,
    phase ? `in ${phase.name}` : null,
    `at ${pullClock(at)}`,
  ].filter((part): part is string => !!part);
  return `${attack} (${where.join(', ')})`;
}

// 1st, 2nd, 3rd, 4th, 11th, 21st...
function ordinal(n: number): string {
  const tens = n % 100;
  const suffix =
    tens >= 11 && tens <= 13 ? 'th' : (({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th');
  return `${n}${suffix}`;
}
