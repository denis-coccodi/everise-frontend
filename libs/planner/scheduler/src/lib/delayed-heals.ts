import { healEvents } from './hp-events';
import { HpTrack } from './hp-track';
import { HealTool, Mechanic, PlannedUse, ShieldSize } from './plan.model';
import type { HpEvent } from './hp-track.model';
import type { Candidate, Spent } from './heal-plan.model';
import { reachable } from './solo-phases';
import type { Weaving } from './weaving';
import type { Occupied } from './weaving.model';

// The HP a use of a heal tool restores, and when, as the pull goes on:
// - a triggered heal (Excogitation) when its target first drops to its
//   share of max HP, or when it ends;
// - a heal by stacks (Haima, Panhaima, Liturgy of the Bell): each hit on
//   whoever holds them uses one up (Liturgy healing the party then), and the
//   rest heal when it ends;
// - Macrocosmos when it ends or is set off (`delayMs`), with its share of
//   the damage each took meanwhile on top;
// any other `delayMs` after it lands (Earthly Star, Exaltation; 0 for a
// heal that lands as it's cast). `hitTimes` says when the mechanics hit a
// player after one moment, up to another (inclusive), `gcdTimes` when they
// use a GCD; a heal that comes only with those, then (`conditionalEvents`).
export function delayedEvents(
  tool: HealTool,
  use: PlannedUse,
  delayMs: number,
  party: number[],
  maxHp: Map<number, number>,
  track: HpTrack,
  hitTimes: (player: number, from: number, to: number) => number[],
  gcdTimes: (player: number, from: number, to: number) => number[] = () => [],
): HpEvent[] {
  if (tool.effects.some((e) => e.on)) {
    const rest = { ...tool, effects: tool.effects.filter((e) => !e.on) };
    const events = rest.effects.length ? delayedEvents(rest, use, delayMs, party, maxHp, track, hitTimes) : [];
    return [...events, ...conditionalEvents(tool, use, party, maxHp, hitTimes, gcdTimes)];
  }
  const delayed = tool.delayed;
  const plain = () => healEvents(tool, use, party, maxHp, delayMs);
  if (!delayed) return plain();
  const from = use.at + tool.castMs;
  const end = delayed.delaysMs[0];
  const to = from + end;
  const atEnd = () => healEvents(tool, use, party, maxHp, end);

  if (delayed.belowShare !== null) {
    const player = use.target ?? use.player;
    const low = track.firstAtOrBelow(player, from, to, delayed.belowShare * (maxHp.get(player) ?? 0));
    return healEvents(tool, use, party, maxHp, low === null ? end : low - from);
  }
  if (delayed.stacks) {
    const { count, holder, perHit } = delayed.stacks;
    const holderOf = (player: number) =>
      holder === 'self' ? use.player : holder === 'target' ? (use.target ?? use.player) : player;
    const used = (player: number) => hitTimes(holderOf(player), from, to).slice(0, count);
    const events = atEnd()
      .map((e) => ({ ...e, amount: e.amount * (count - used(e.player).length) }))
      .filter((e) => e.amount > 0);
    if (perHit) {
      for (const at of used(use.player)) {
        for (const player of party.filter((p) => reachable(tool.alone, use.player, use.at, p)))
          events.push({ at, player, amount: sizeOf(perHit, player, maxHp) });
      }
    }
    return events;
  }
  if (delayed.damageShare !== null) {
    // At its end, or sooner when set off (Microcosmos), with what it has
    // gathered by then.
    const share = delayed.damageShare;
    return healEvents(tool, use, party, maxHp, delayMs).map((e) => ({
      ...e,
      amount: e.amount + share * track.damageBetween(e.player, from, from + delayMs),
    }));
  }
  return plain();
}

function sizeOf(size: ShieldSize, player: number, maxHp: Map<number, number>) {
  return 'hp' in size ? size.hp : size.maxHpShare * (maxHp.get(player) ?? 0);
}

// Macrocosmos's Microcosmos: shown where it heals on its own too (`again: 'ends'`, as its 15s end, nothing pressed).
const MICROCOSMOS = 25875;

// What a delayed heal's release adds for a pick covering `mechanic`: pressed sooner than it goes off on its own (Stellar
// Detonation, Microcosmos), a use and the slot it takes; Macrocosmos left to its end, an event in no slot; else nothing.
export function releaseOf(pick: Candidate, mechanic: number): { use: PlannedUse; spent: Spent | null } | null {
  const { delayed } = pick.tool;
  const ends = !!delayed && pick.delayMs >= delayed.delaysMs[0];
  if (!delayed?.release || (ends && delayed.release.action !== MICROCOSMOS)) return null;
  const at = pick.use.at + pick.tool.castMs + pick.delayMs;
  const use: PlannedUse = { ...pick.use, ...delayed.release, at, target: null, covers: [mechanic] };
  if (ends) return { use: { ...use, covers: [], again: 'ends' }, spent: null };
  const { player } = pick.use;
  const spent = {
    player,
    action: delayed.release.action,
    group: `release:${player}`,
    pool: null,
    at,
    gcd: false,
    castMs: 0,
  };
  return { use, spent };
}

// The heals of `tool` that come only with what its user does next (`on`):
// with each of their GCDs while it lasts (Bloodwhetting: on them, or Nascent
// Flash's on its target too), or from the first hit on whoever it's on in its
// window (Tengentsu's Foresight), else as that ends where it says so
// (Damnation's Primeval Impulse), else none.
function conditionalEvents(
  tool: HealTool,
  use: PlannedUse,
  party: number[],
  maxHp: Map<number, number>,
  hitTimes: (player: number, from: number, to: number) => number[],
  gcdTimes: (player: number, from: number, to: number) => number[],
): HpEvent[] {
  const lands = use.at + tool.castMs;
  return tool.effects.flatMap((effect) => {
    const on = effect.on;
    if (!on) return [];
    const only = { ...tool, castMs: 0, effects: [{ ...effect, on: undefined }] };
    const at = (time: number) => healEvents(only, { ...use, at: time }, party, maxHp);
    if (on.each === 'gcd') return gcdTimes(use.player, lands, lands + on.withinMs).flatMap(at);
    const hit = (player: number) =>
      hitTimes(player, lands, lands + on.withinMs)[0] ?? (on.orAtEnd ? lands + on.withinMs : null);
    const first = hit(effect.target === 'self' ? use.player : (use.target ?? use.player));
    return first === null ? [] : at(first);
  });
}

// A gathering heal (Macrocosmos) left to its end is set off this long after the last raidwide of its window, where that
// comes this long before its end at least: the logs' astrologians pressed Microcosmos for 37 of 92 Macrocosmos, a median
// 1.4s after a raidwide, and seldom where the last came in its final seconds (4s: on 8 ultimate kills, 18 of 34 pressed,
// the logs 16 of 37; 2s pressed 26 of 36).
const AFTER_RAIDWIDE_MS = 1_000;
const BEFORE_END_MS = 4_000;

// The pick with a gathering heal left to its end (Macrocosmos, `pick.delayMs` its whole wait) set off instead in the
// first free weave slot (beside the caster's `spent`: `releaseSlot`) from a second after the last raidwide in its window (4 players or more) to its
// end, as players press Microcosmos once the hit is in, in a weave slot (on the bench's logs, alone in its gap 27 times
// of 38): the same damage gathered, healed sooner (`eventsFor` its new healing). With no slot free, it heals as it
// ends. Any other pick as it is.
export function soonerRelease(
  pick: Candidate,
  mechanics: Mechanic[],
  eventsFor: (tool: HealTool, use: PlannedUse, delayMs: number) => HpEvent[],
  weaving: Weaving,
  spent: Spent[],
): Candidate {
  const delayed = pick.tool.delayed;
  if (!delayed?.release || delayed.damageShare === null || pick.delayMs < delayed.delaysMs[0]) return pick;
  const lands = pick.use.at + pick.tool.castMs;
  const last = Math.max(
    ...mechanics
      .filter((m) => m.kind === 'raidwide' && m.hits.filter((h) => !h.avoidable).length >= 4)
      .map((m) => m.at)
      .filter((at) => at > lands && at <= lands + delayed.delaysMs[0] - BEFORE_END_MS),
  );
  if (last === -Infinity) return pick;
  const { player } = pick.use;
  const own = [
    ...spent.filter((s) => s.player === player),
    { at: pick.use.at, gcd: pick.tool.gcd, castMs: pick.tool.castMs },
  ];
  const at = releaseSlot(weaving, player, last + AFTER_RAIDWIDE_MS, lands + delayed.delaysMs[0] - 1, own);
  if (at === null) return pick;
  const delayMs = at - lands;
  return { ...pick, delayMs, events: eventsFor(pick.tool, pick.use, delayMs) };
}

// The first weave slot from `from` to `to` in a gap with no other oGCD of the player's (one more still fits beside it),
// as the logs' astrologians press Microcosmos (alone in its gap 27 times of 38); else the first free one; null when none.
function releaseSlot(weaving: Weaving, player: number, from: number, to: number, own: Occupied[]) {
  const first = weaving.ogcdAfter(player, from, to, own);
  for (let at = first; at !== null;) {
    const [prev] = weaving.gcdsBetween(player, at - GAP_MS, at).slice(-1);
    const [next] = weaving.gcdsBetween(player, at + 1, at + GAP_MS);
    if (prev === undefined || next === undefined) return at;
    const withIt = [...own, { at, gcd: false, castMs: 0 }];
    if (weaving.ogcdAfter(player, prev, next - 1, withIt) !== null) return at;
    at = next > to ? null : weaving.ogcdAfter(player, next, to, own);
  }
  return first;
}
// How far apart two GCDs of a player can be and still have a gap between them.
const GAP_MS = 10_000;
