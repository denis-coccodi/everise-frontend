import { fitsGrant, fitsPool, fitsRecast, isAway, poolFull } from './coverage';
import { KARDIA, KARDIA_HEALS, SOTERIA, TICK_MS } from './heal-tools';
import { Favour, HealCost, HealTool, Mechanic, PlannedUse } from './plan.model';
import { cutsUnion } from './fairy-heals';
import { Weaving } from './weaving';
import type { Candidate, Paired, Spent } from './heal-plan.model';
import type { HpEvent } from './hp-track.model';
import type { Occupied } from './weaving.model';

// How soon after the four spells a moved Kardia goes back at the latest.
const KARDIA_BACK_MS = 5_000;

// When a sage puts Kardia back on its holder after moving it at `at`: it
// stays where it's put, so it's pressed again, in the first weave slot
// after the four spells it was moved for; null when none comes soon.
export function kardiaBack(player: number, at: number, weaving: Weaving, occupied: Occupied[]) {
  const due = at + KARDIA_HEALS * TICK_MS;
  return weaving.ogcdAfter(player, due, due + KARDIA_BACK_MS, occupied);
}

// A heal lands at least this long before the hit it's for, and at least
// this long after the hits before it.
const LEAD_MS = 500;
const AFTER_MS = 1000;
// How long before the pull an Earthly Star can go down (in the countdown).
const PREPULL_MS = 15_000;
const EARTHLY_STAR = 7439;
// What a heal's healing is worth for what it costs (`HealCost`): a free
// oGCD first, then one spending Aetherflow, a GCD that costs no damage
// (Afflatus Solace), then any other GCD, which costs a GCD of damage. One
// whose pool is full costs nothing, so it goes before the free ones: lilies
// and Addersgall are spent rather than left to overcap. A healer favouring
// healing over damage (`Favour`) minds a GCD's damage less.
const WORTH: Record<Favour, Record<HealCost, number>> = {
  dps: { free: 1, resource: 0.85, neutral: 0.8, gcd: 0.4 },
  healing: { free: 1, resource: 0.95, neutral: 0.9, gcd: 0.8 },
};
const FULL_WORTH = 1.05;

// The most a use of `tool` can make up of the deficits before `m`, at the
// earliest moment it can heal after the anchor or as late as it can (a
// delayed heal with each of its delays, the one that needs nothing more
// first); null when it can't be used or helps no one short.
export function best(
  tool: HealTool,
  m: Mechanic,
  anchor: number,
  short: Map<number, number>,
  spent: Spent[],
  eventsOf: (use: PlannedUse, delayMs: number) => HpEvent[],
  deficits: (extra: HpEvent[]) => Map<number, number>,
  weaving: Weaving,
  pairWith: (use: PlannedUse, events: HpEvent[]) => Paired[],
  favourOf: (player: number) => Favour,
  // Whether the healer has the MP for it then (MpModel).
  affordable: (at: number) => boolean = () => true,
): Candidate | null {
  const latest = m.at - LEAD_MS;
  const earliest = Math.min(latest, Math.max(0, anchor + AFTER_MS));
  if (latest <= anchor) return null;
  const times = spent.filter((s) => s.group === tool.group).map((s) => s.at);
  const pooled = tool.pool ? spent.filter((s) => s.player === tool.player && s.pool?.name === tool.pool?.name) : [];
  const occupied = spent.filter((s) => s.player === tool.player);
  const timesOf = (action: number) =>
    spent.filter((s) => s.player === tool.player && s.action === action).map((s) => s.at);
  // A heal on one member goes to whoever is shortest; Soteria's on the
  // Kardion holder, Kardia moved to anyone else.
  const holder = tool.kardion?.find((s) => s.from <= m.at && m.at < s.to)?.player;
  if (tool.kardion && holder === undefined) return null;
  const others = [...short].filter(([p]) => tool.action !== KARDIA || p !== holder);
  if (!others.length) return null;
  const target =
    tool.action === SOTERIA
      ? (holder ?? null)
      : tool.effects.some((e) => e.target === 'target')
        ? others.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
        : null;
  let found: Candidate | null = null;
  const end = tool.delayed?.delaysMs[0] ?? 0;
  // Each moment as early or as late as it can be, then where the healer can
  // act: the first chance from it on, or the last up to it.
  const moments =
    tool.delayed?.belowShare != null
      ? // A triggered heal goes up before the hit that sets it off: the last
        // mechanic's, or one after it.
        [...new Set([anchor - LEAD_MS, earliest])].map((up) => ({ at: up - tool.castMs, delayMs: end, late: true }))
      : [...new Set([earliest, latest])].flatMap((lands) =>
          (tool.delayed?.delaysMs ?? [0]).map((delayMs) => ({
            at: lands - tool.castMs - delayMs,
            delayMs,
            late: lands === latest,
          })),
        );
  // Earthly Star can go down before the pull, in the countdown (not
  // Macrocosmos, a damage spell).
  const first = tool.action === EARTHLY_STAR ? -PREPULL_MS : 0;
  for (const moment of moments) {
    const { delayMs } = moment;
    const lo = Math.max(first, earliest - tool.castMs - delayMs);
    const hi = latest - tool.castMs - delayMs;
    const from = Math.max(first, moment.at);
    const at = tool.gcd
      ? moment.late
        ? weaving.gcdBefore(tool.player, moment.at, lo, tool.castMs, occupied)
        : weaving.gcdAfter(tool.player, from, hi, tool.castMs, occupied)
      : moment.late
        ? weaving.ogcdBefore(tool.player, moment.at, lo, occupied)
        : weaving.ogcdAfter(tool.player, from, hi, occupied);
    if (at === null || at < first || isAway(tool, at) || !fitsRecast(times, at, tool.recastMs, tool.charges)) continue;
    if (cutsUnion(tool.action, at, timesOf)) continue;
    // A star set off sooner needs a weave slot for its Stellar Detonation.
    const release = tool.delayed?.release && delayMs < end ? at + tool.castMs + delayMs : null;
    const withIt = [...occupied, { at, gcd: tool.gcd, castMs: tool.castMs }];
    if (release !== null && weaving.ogcdAfter(tool.player, release, release, withIt) !== release) continue;
    // A moved Kardia needs a slot to go back in.
    if (tool.action === KARDIA && kardiaBack(tool.player, at, weaving, withIt) === null) continue;
    if (
      tool.pool &&
      !fitsPool(
        pooled.map((s) => s.at),
        at,
        tool.pool,
      )
    )
      continue;
    if (!affordable(at)) continue;
    const { grantedBy } = tool;
    if (grantedBy && !fitsGrant(timesOf(tool.action), timesOf(grantedBy.action), at, grantedBy)) continue;
    const use: PlannedUse = { player: tool.player, action: tool.action, name: tool.name, at, target, covers: [m.id] };
    const full =
      tool.pool &&
      poolFull(
        pooled.map((s) => s.at),
        at,
        tool.pool,
      );
    const worth = full ? FULL_WORTH : WORTH[favourOf(tool.player)][tool.cost];
    // On its own, or with each oGCD that can go with it.
    const alone = eventsOf(use, delayMs);
    const options = [
      { events: alone, paired: null },
      ...pairWith(use, alone).map((p) => ({ events: p.events, paired: p })),
    ];
    for (const { events, paired } of options) {
      const after = deficits(events);
      let value = 0;
      for (const [player, deficit] of short) {
        if (deficit > 0) value += deficit - Math.max(0, after.get(player) ?? deficit);
      }
      value *= worth;
      if (value > 0 && (!found || value > found.value)) found = { use, tool, events, value, delayMs, paired };
    }
  }
  return found;
}

// The most made up; on a tie, the cooldown that comes back soonest (its
// recast, or its pool's refill when that's longer: Aetherpact's gauge).
export function better(a: Candidate, b: Candidate) {
  const back = (c: Candidate) => Math.max(c.tool.recastMs, c.tool.pool?.gainMs ?? 0);
  return a.value > b.value || (a.value === b.value && back(a) < back(b));
}
