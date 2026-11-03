import type { PullTimeline, TimelineDeath } from '@everise/core/api-types';
import { isMechanicHit, mechanicsOf } from './mechanics';
import type { Mechanic } from './plan.model';

// A death this soon after a hit is the hit's.
const DEATH_MS = 2_000;
// The log has a death about 2 s after the hit that killed (`overkill`, or
// no HP left): looked for this far back.
const KILL_MS = 5_000;
// Deaths this close together are one moment: one mechanic's.
const SAME_DEATH_MS = 1_000;
// A player acting this long after their death was raised.
const RAISED_MS = 1_000;
// Hits of one attack this close to the first are one mechanic (as in
// `mechanicsOf`).
const SAME_MECHANIC_MS = 1_000;
// One mechanic's casts by name, each this close to the last.
const SAME_CAST_MS = 3_000;
// More mechanics than this survived between two deaths, and the party had
// recovered: the earlier death isn't the wipe's. On real wipes the party
// survived up to 3 inside the final string, and 9 or more outside it.
const MAX_SURVIVED = 4;
const AUTO_ATTACK = /^attack$/i;

// Where a wipe was lost: just before the mechanic that started its final
// string of deaths. The string runs back from the last death while nobody
// in it was raised (acted or died again after), and while the party, in
// between, didn't survive more than `MAX_SURVIVED` mechanics. A death's
// mechanic is the one its killing hit is part of (an auto-attack's, its
// own moment): the one that left them no HP, else the latest just before;
// without a hit, the boss's latest cast before it (a mechanic
// that kills without damage); else the death itself. Everything up to it
// is as played. The end of the log when nobody died, or the party
// survived more than `MAX_SURVIVED` mechanics after the last death.
export function wipePoint(timeline: PullTimeline): number {
  const deaths = [...timeline.deaths].sort((a, b) => a.at - b.at);
  const mechanics = mechanicsOf(timeline);
  const raised = (d: TimelineDeath) =>
    deaths.some((o) => o.player === d.player && o.at > d.at) ||
    timeline.playerCasts.some((c) => c.source === d.player && c.at > d.at + RAISED_MS);
  const survived = (from: number, to: number) => mechanics.filter((m) => m.at > from && m.at < to - DEATH_MS).length;

  // A log that ends with the party living on (it left the duty).
  const last = deaths.at(-1);
  if (!last || survived(last.at, timeline.durationMs + DEATH_MS) > MAX_SURVIVED) return timeline.durationMs;
  let start = deaths.length;
  for (let i = deaths.length - 1; i >= 0; i--) {
    const next = deaths[i + 1];
    if (raised(deaths[i]) || (next && survived(deaths[i].at, next.at) > MAX_SURVIVED)) {
      // The rest of its moment goes with it.
      while (start < deaths.length && deaths[start].at - deaths[i].at <= SAME_DEATH_MS) start++;
      break;
    }
    start = i;
  }
  if (start === deaths.length) return timeline.durationMs;
  const first = deaths[start].at;
  const causes = deaths
    .filter((d, i) => i >= start && d.at - first <= SAME_DEATH_MS)
    .map((d) => cause(timeline, d, mechanics));
  return Math.min(...causes) - 1;
}

// When the mechanic that killed `death` started.
function cause(timeline: PullTimeline, death: TimelineDeath, mechanics: Mechanic[]): number {
  const names = new Map(timeline.actions.map((a) => [a.id, a.name]));
  const hits = timeline.damage
    .filter(
      (h) => h.target === death.player && !h.tick && h.amount > 0 && h.at <= death.at && death.at - h.at <= KILL_MS,
    )
    .sort((a, b) => a.at - b.at);
  const near = hits.filter((h) => death.at - h.at <= DEATH_MS);
  const hit =
    hits.filter((h) => h.overkill > 0 || h.hp === 0).at(-1) ??
    near.filter((h) => isMechanicHit(h, names)).at(-1) ??
    near.at(-1);
  if (hit) {
    const mechanic = mechanics.find(
      (m) => m.action === hit.action && m.at <= hit.at && hit.at - m.at <= SAME_MECHANIC_MS,
    );
    return mechanic?.at ?? hit.at;
  }
  const casts = timeline.enemyCasts
    .filter((c) => c.at <= death.at && !AUTO_ATTACK.test(names.get(c.action) ?? ''))
    .sort((a, b) => a.at - b.at);
  let k = casts.length - 1;
  if (k < 0) return death.at;
  const name = names.get(casts[k].action);
  while (k > 0 && names.get(casts[k - 1].action) === name && casts[k].at - casts[k - 1].at <= SAME_CAST_MS) k--;
  return casts[k].at;
}
