import { PullTimeline } from '@everise/core/api-types';
import type { HpEvent } from './hp-track.model';
import type { PlannedHp, PlannedUse } from './plan.model';
import { AETHERPACT, SERAPHIC_VEIL, SERAPH_MS, SUMMON_SERAPH } from './tools';

// What the scholar's fairy heals on her own, for a scholar the plan
// replans: Eos or Selene casts Embrace on a party member missing HP, and
// Seraph (22s from Summon Seraph, the fairy away meanwhile) Seraphic Veil,
// one every 3.2s while anyone is missing HP; neither while Dissipation has
// sent the fairy away (30s). Each is 180 potency (150 below level 85, before
// Enhanced Healing Magic). The game has her pick the
// closest member missing HP, which the planner can't know (no positions):
// it picks the one missing the largest share of their HP. Seraphic Veil's
// barrier isn't counted.
export const EMBRACE = 802;
const DISSIPATION = 3587;
const DISSIPATION_MS = 30_000;
const CAST_EVERY_MS = 3200;
// The fairy's orders, and Seraphism (which needs her out too): Whispering
// Dawn, Fey Illumination, Fey Blessing, Aetherpact.
const NEEDS_FAIRY = new Set([16537, 16538, 16543, AETHERPACT, 37014]);

// Embrace's and Seraphic Veil's potency at a level.
export const fairyPotency = (level: number) => (level >= 85 ? 180 : 150);

// When a scholar's fairy is away, as played: 30s from each Dissipation.
const dissipations = (timeline: PullTimeline, scholar: number) =>
  timeline.playerCasts
    .filter((c) => c.source === scholar && c.action === DISSIPATION)
    .map((c) => ({ from: c.at, to: c.at + DISSIPATION_MS }));

// The tools with the spans their player's fairy is away in, for those that
// need her: none of them while Dissipation has her away.
export function withFairyAway<T extends { player: number; action: number }>(timeline: PullTimeline, tools: T[]): T[] {
  return tools.map((t) => (NEEDS_FAIRY.has(t.action) ? { ...t, away: dissipations(timeline, t.player) } : t));
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
// heal in the pull; none when she never healed in it.
export function fairyHeals(
  timeline: PullTimeline,
  scholar: number,
  power: number | null,
  uses: PlannedUse[],
  hp: PlannedHp[],
  maxHp: Map<number, number>,
  potency: number,
): HpEvent[] {
  const first = timeline.heals.find((h) => h.source === scholar && h.pet)?.at;
  if (first === undefined || !power) return [];
  const away = dissipations(timeline, scholar);
  const seraph = uses
    .filter((u) => u.player === scholar && u.action === SUMMON_SERAPH)
    .map((u) => ({ from: u.at, to: u.at + SERAPH_MS }));
  const within = (spans: { from: number; to: number }[], at: number) => spans.some((s) => at >= s.from && at < s.to);
  const events: HpEvent[] = [];
  for (let at = first; at <= timeline.durationMs; at += CAST_EVERY_MS) {
    // Dissipation sends the fairy away; Seraph casts in her place.
    if (within(away, at) && !within(seraph, at)) continue;
    const target = mostMissing(hp, maxHp, at);
    if (target !== null) events.push({ at, player: target, amount: Math.round(potency * power) });
  }
  return events;
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
