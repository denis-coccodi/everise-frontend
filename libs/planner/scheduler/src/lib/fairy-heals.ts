import { PullTimeline } from '@everise/core/api-types';
import type { HpEvent } from './hp-track.model';
import type { FairyHealing } from './heal-plan.model';
import type { Plan, PlannedHp, PlannedUse } from './plan.model';
import { AETHERPACT, FEY_UNION_TICKS, SERAPHIC_VEIL, SERAPH_MS, SUMMON_SERAPH } from './tools';

// What the scholar's fairy heals on her own, for a scholar the plan
// replans: Eos or Selene casts Embrace on a party member missing HP, and
// Seraph (22s from Summon Seraph, the fairy away meanwhile) Seraphic Veil,
// one every 3.2s while anyone is missing HP; neither while Dissipation has
// sent the fairy away (30s). Each is 180 potency (150 below level 85, before
// Enhanced Healing Magic). The game has her pick the
// closest member missing HP, which the planner can't know (no positions):
// it picks the one missing the largest share of their HP. Seraphic Veil's
// barrier comes as a use of hers (`casts`), for the mitigations to count.
export const EMBRACE = 802;
const DISSIPATION = 3587;
const DISSIPATION_MS = 30_000;
const CAST_EVERY_MS = 3200;
// The fairy's orders, and Seraphism (which needs her out too): Whispering
// Dawn, Fey Illumination, Fey Blessing, Aetherpact.
const SERAPHISM = 37014;
const SERAPHISM_MS = 20_000;
const NEEDS_FAIRY = new Set([16537, 16538, 16543, AETHERPACT, SERAPHISM]);

// A Fey Union ends when the scholar orders the fairy anything else, or
// sends her off for Seraph: the plan puts none of these in a union it has,
// nor a union where one is coming before its last tick.
const ENDS_UNION = new Set([16537, 16538, 16543, SUMMON_SERAPH]);
const UNION_MS = FEY_UNION_TICKS * 3000;

// Whether using `action` at `at` would cut a Fey Union short, with the
// times its player uses each action (`timesOf`).
export function cutsUnion(action: number, at: number, timesOf: (action: number) => number[]): boolean {
  if (action === AETHERPACT) return [...ENDS_UNION].some((o) => timesOf(o).some((t) => t >= at && t < at + UNION_MS));
  return ENDS_UNION.has(action) && timesOf(AETHERPACT).some((t) => at >= t && at < t + UNION_MS);
}

// Embrace's and Seraphic Veil's potency at a level.
export const fairyPotency = (level: number) => (level >= 85 ? 180 : 150);

// When a scholar's fairy is away, as played: 30s from each Dissipation.
// (or at the times `given`, an opener's).
const dissipations = (timeline: PullTimeline, scholar: number, given?: number[]) =>
  (given ?? timeline.playerCasts.filter((c) => c.source === scholar && c.action === DISSIPATION).map((c) => c.at)).map(
    (at) => ({ from: at, to: at + DISSIPATION_MS }),
  );

// The tools with the spans their player's fairy is away in, for those that
// need her: none of them while Dissipation has her away. Nor Seraphism in
// the 20s before one: Dissipation can't be used while it's up.
export function withFairyAway<T extends { player: number; action: number }>(
  timeline: PullTimeline,
  tools: T[],
  given = new Map<number, number[]>(),
): T[] {
  return tools.map((t) => {
    if (!NEEDS_FAIRY.has(t.action)) return t;
    const away = dissipations(timeline, t.player, given.get(t.player));
    const before = t.action === SERAPHISM ? away.map((s) => ({ from: s.from - SERAPHISM_MS, to: s.from })) : [];
    return { ...t, away: [...before, ...away] };
  });
}

// The keys (scholar:action) of the heals `fairyHeals` works out, for the
// pull's own to be left out.
export const fairyKeys = (scholar: number) => [`${scholar}:${EMBRACE}`, `${scholar}:${SERAPHIC_VEIL}`];

// HP a potency of the fairy's healing restores: the lower quarter of her
// own heals in the pull (most critical heals left out), or the scholar's.
export function fairyPower(
  timeline: PullTimeline,
  scholar: number,
  own: number | null,
  potency: number,
): number | null {
  const per = timeline.heals
    .filter((h) => h.source === scholar && h.pet && (h.action === EMBRACE || h.action === SERAPHIC_VEIL))
    .map((h) => (h.amount + h.overheal) / potency)
    .sort((a, b) => a - b);
  return per.length ? per[Math.floor(per.length / 4)] : own;
}

// The fairy's heals over the pull with the plan's Summon Seraph (`uses`)
// and the HP the plan leaves (`hp`, of the round before), from her first
// heal in the pull, and Seraph's Seraphic Veils among them as uses (for
// their barriers); none when she never healed in it.
export function fairyHeals(
  timeline: PullTimeline,
  scholar: number,
  power: number | null,
  uses: PlannedUse[],
  hp: PlannedHp[],
  maxHp: Map<number, number>,
  potency: number,
  given?: number[],
): { events: HpEvent[]; casts: PlannedUse[] } {
  const first = timeline.heals.find((h) => h.source === scholar && h.pet)?.at;
  if (first === undefined || !power) return { events: [], casts: [] };
  const away = dissipations(timeline, scholar, given);
  const seraph = uses
    .filter((u) => u.player === scholar && u.action === SUMMON_SERAPH)
    .map((u) => ({ from: u.at, to: u.at + SERAPH_MS }));
  const within = (spans: { from: number; to: number }[], at: number) => spans.some((s) => at >= s.from && at < s.to);
  const events: HpEvent[] = [];
  const casts: PlannedUse[] = [];
  for (let at = first; at <= timeline.durationMs; at += CAST_EVERY_MS) {
    // Dissipation sends the fairy away; Seraph casts in her place.
    const veil = within(seraph, at);
    if (within(away, at) && !veil) continue;
    const target = mostMissing(hp, maxHp, at);
    if (target === null) continue;
    events.push({ at, player: target, amount: Math.round(potency * power) });
    if (veil) casts.push({ player: scholar, action: SERAPHIC_VEIL, name: 'Seraphic Veil', at, target, covers: [] });
  }
  return { events, casts };
}

// The living party member missing the largest share of their HP just
// before `at`; null when nobody is missing any.
function mostMissing(hp: PlannedHp[], maxHp: Map<number, number>, at: number): number | null {
  let pick: number | null = null;
  let lowest = 1;
  for (const { player, points } of hp) {
    const max = maxHp.get(player);
    let now = max;
    for (const p of points) {
      if (p.at >= at) break;
      now = p.hp;
    }
    if (!max || now === undefined || now <= 0) continue;
    const share = now / max;
    if (share < lowest) {
      lowest = share;
      pick = player;
    }
  }
  return pick;
}

// The replanned scholars' fairies, healing as the HP of the plan before
// (`from`) calls for: their heals, and the HP events and casts they make;
// nothing before a first plan.
export function scholarsFairy(
  timeline: PullTimeline,
  scholars: { id: number }[],
  powers: Map<number, number | null>,
  maxHp: Map<number, number>,
  potency: number,
  given: Map<number, number[]>,
  from?: Plan,
): { healing: FairyHealing; casts: PlannedUse[] } {
  if (!from?.hp.length) return { healing: { events: [], recalculated: [] }, casts: [] };
  const each = scholars.map((s) =>
    fairyHeals(timeline, s.id, powers.get(s.id) ?? null, from.uses, from.hp, maxHp, potency, given.get(s.id)),
  );
  return {
    healing: { events: each.flatMap((f) => f.events), recalculated: scholars.flatMap((s) => fairyKeys(s.id)) },
    casts: each.flatMap((f) => f.casts),
  };
}
