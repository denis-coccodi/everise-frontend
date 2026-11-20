import { fitsRecast } from './coverage';
import { HealPairing, HealTool, Mechanic, MitigationTool, PlannedUse } from './plan.model';
import { Weaving } from './weaving';
import type { Paired } from './heal-plan.model';
import type { HpEvent } from './hp-track.model';
import type { Occupied } from './weaving.model';

// A pairing's heal on top that can wait for the damage, by action: Horoscope
// Helios lasts 30s after the Helios and heals when read again, so it's read
// as the Helios lands or right after the next hit (`nextHit`) on those it
// reached (or as it runs out), whichever heals more: read only on landing, it
// healed a full party before the hit.
const RESOLVES_MS: Record<number, number> = { 16557: 30_000 };
// How long after that hit it's read: the hit's damage in first.
const AFTER_HIT_MS = 1_000;

// When the first of `mechanics` after `after` hits any of `players`; null when none does.
function nextHit(mechanics: Mechanic[], after: number, players: number[]) {
  const hits = mechanics.filter((m) => m.at > after && m.hits.some((h) => !h.avoidable && players.includes(h.player)));
  return hits.length ? Math.min(...hits.map((m) => m.at)) : null;
}

// The ways a use of a GCD heal can go with one of its user's pairings
// (Plenary Indulgence before a Medica): each up in a weave slot before the
// heal's cast, within its window and as its recast allows (`groupTimes`
// says when its group was used), and the heal's `events` with it, bigger
// or with Confession's heal on each member the heal reaches as it lands
// (or after the next hit, `RESOLVES_MS`), and its own healing (`ownEvents`: Physis II's regen).
export function pairingsFor(
  pairings: HealPairing[],
  tool: HealTool,
  use: PlannedUse,
  events: HpEvent[],
  occupied: Occupied[],
  groupTimes: (group: string) => number[],
  weaving: Weaving,
  maxHp: Map<number, number>,
  ownEvents: (pairing: HealPairing, use: PlannedUse) => HpEvent[] = () => [],
  short = new Map<number, number>(),
  mechanics: Mechanic[] = [],
): Paired[] {
  if (!events.length) return [];
  // The heal itself takes its slot: an oGCD's weave, a GCD's own.
  const around = [...occupied, { at: use.at, gcd: tool.gcd, castMs: tool.castMs }];
  const healed = use.target ?? use.player;
  const lands = Math.min(...events.map((e) => e.at));
  const reached = [...new Set(events.filter((e) => e.at === lands).map((e) => e.player))];
  const found: Paired[] = [];
  // A barrier the heal leaves anyway, in a window already up (Neutral Sect).
  let upBarrier: Paired['barrier'] = null;
  for (const pairing of pairings) {
    if (pairing.player !== use.player || !pairing.heals.includes(use.action)) continue;
    // In the window of one already up (Neutral Sect, for Sun Sign or an
    // earlier heal): the heal leaves its barrier too, nothing more to press
    // (its potency buff counts already).
    const up = pairing.barriers[use.action]
      ? groupTimes(pairing.group).find((t) => t < use.at && use.at - t <= pairing.withinMs)
      : undefined;
    if (up !== undefined) {
      const open = { player: use.player, action: pairing.action, name: pairing.name, at: up, target: null, covers: [] };
      const barrier = barrierOf(
        pairing,
        tool,
        use,
        events.filter((e) => e.at === lands),
      );
      if (barrier) found.push({ use: open, pairing, events, barrier, open: true });
      upBarrier = barrier;
      continue;
    }
    const at = weaving.ogcdBefore(use.player, use.at - 1, use.at - pairing.withinMs + tool.castMs, around);
    if (at === null || at < 0 || !fitsRecast(groupTimes(pairing.group), at, pairing.recastMs, pairing.charges)) {
      continue;
    }
    const { extra } = pairing;
    const resolves = RESOLVES_MS[pairing.action];
    const hit = resolves ? nextHit(mechanics, lands, reached) : null;
    // Read as the Helios lands or after the next hit: both are tried, the one healing more kept.
    const later = Math.min(lands + (resolves ?? 0), hit === null ? Infinity : hit + AFTER_HIT_MS);
    const reads = resolves ? [...new Set([lands, later])] : [undefined];
    const more = (readAt: number | undefined) =>
      extra
        ? reached.map((player) => ({
            at: readAt ?? lands,
            player,
            amount: 'hp' in extra ? extra.hp : extra.maxHpShare * (maxHp.get(player) ?? 0),
          }))
        : [];
    // On one member (Krasis), only the heal on them.
    const boosted = events.map((e) =>
      pairing.onTarget && e.player !== healed ? e : { ...e, amount: e.amount * pairing.times },
    );
    const target = pairing.onTarget ? healed : null;
    // Synastry's bond, on whoever else is shortest: its share of the heal.
    // The game puts it on another member only, never on its caster.
    const neediest = [...short]
      .filter(([player]) => player !== use.player)
      .reduce<[number, number] | null>((a, b) => (!a || b[1] > a[1] ? b : a), null);
    const bondTo = pairing.bond ? (neediest?.[0] ?? (healed !== use.player ? healed : null)) : null;
    if (pairing.bond && bondTo === null) continue;
    const bonded = boosted
      .filter((e) => bondTo !== null && e.at === lands && e.player === healed)
      .map((e) => ({ at: lands, player: bondTo as number, amount: e.amount * pairing.bond }));
    const on = bondTo ?? target;
    const paired = {
      player: use.player,
      action: pairing.action,
      name: pairing.name,
      at,
      target: on,
      covers: use.covers,
    };
    const barrier = barrierOf(
      pairing,
      tool,
      use,
      boosted.filter((e) => e.at === lands),
    );
    for (const readAt of reads) {
      const events = [...boosted, ...more(readAt), ...bonded, ...(pairing.own ? ownEvents(pairing, paired) : [])];
      found.push({ use: paired, pairing, ...(readAt === undefined ? {} : { readAt }), events, barrier });
    }
  }
  // With another pairing (Horoscope before the Helios that also takes Neutral
  // Sect's barrier) the barrier comes too: one Helios sets off both.
  return upBarrier ? found.map((p) => (p.barrier || p.open ? p : { ...p, barrier: upBarrier })) : found;
}

// How long a pairing's barrier lasts.
const BARRIER_MS = 30_000;

// The barrier a pairing leaves with this heal (`landed`: what it heals each
// member as it lands), as a shield tool and its use; null when it leaves
// none. Its use's action is the pairing's, made negative, apart from it.
function barrierOf(pairing: HealPairing, tool: HealTool, use: PlannedUse, landed: HpEvent[]) {
  const share = pairing.barriers[use.action];
  if (!share || !landed.length) return null;
  const party = tool.effects.some((e) => e.target === 'party');
  const hp = share * Math.min(...landed.map((e) => e.amount));
  const barrier: MitigationTool = {
    player: use.player,
    action: -pairing.action,
    name: pairing.name,
    recastMs: 0,
    charges: 1,
    gcd: false,
    castMs: 0,
    group: `barrier:${use.player}`,
    pool: null,
    grantedBy: null,
    effects: [
      {
        target: party ? 'party' : 'target',
        physical: 0,
        magic: 0,
        shield: { hp },
        hits: 1,
        durationMs: BARRIER_MS,
        status: pairing.name,
        stack: pairing.name,
        invulnerable: null,
      },
    ],
  };
  const at = Math.min(...landed.map((e) => e.at));
  return { use: { ...use, action: barrier.action, name: barrier.name, at, covers: [] }, tool: barrier };
}

// A heal spell in a Synastry's 20s (among `uses`, the ones planned first)
// heals its bond its share too.
export function bonded(
  pairings: HealPairing[],
  uses: PlannedUse[],
  tool: HealTool,
  use: PlannedUse,
  own: HpEvent[],
): HpEvent[] {
  const p = pairings.find((o) => o.bond && o.player === use.player && o.heals.includes(tool.action));
  const bond = p && uses.find((u) => u.action === p.action && u.player === use.player && u.at <= use.at);
  if (!p || !bond || bond.target === null || use.at > bond.at + p.withinMs || !own.length) return [];
  const lands = Math.min(...own.map((e) => e.at));
  const healed = use.target ?? use.player;
  return own
    .filter((e) => e.at === lands && e.player === healed)
    .map((e) => ({ at: lands, player: bond.target as number, amount: e.amount * p.bond }));
}
