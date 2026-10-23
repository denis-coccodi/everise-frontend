import { MitigationTool, Plan, PlannedUse } from './plan.model';
import { Weaving } from './weaving';
import type { WalkingDead } from './walking-dead.model';

// How long Walking Dead lasts: the tank must be healed by their max HP in it.
const WALKING_DEAD_MS = 10_000;

// Each Living Dead in the plan with the hit that sets it off, and the heals
// of the tank's own GCDs (as played) while it and Walking Dead last: the
// tank mostly heals themselves out of it, the healers making up the rest.
// The checks get ids below 0, apart from the pull's mechanics.
export function walkingDeads(
  plan: Plan,
  toolOf: (use: PlannedUse) => MitigationTool | undefined,
  maxHp: Map<number, number>,
  margin: number,
  weaving: Weaving,
): WalkingDead[] {
  const found: WalkingDead[] = [];
  for (const use of plan.uses) {
    const effect = toolOf(use)?.effects.find((e) => e.invulnerable === 'walkingDead');
    if (!effect) continue;
    const trigger = plan.mechanics
      .filter((m) => m.at >= use.at && m.at <= use.at + effect.durationMs)
      .sort((a, b) => a.at - b.at)
      .find((m) => m.hits.some((h) => h.player === use.player && !h.avoidable));
    const max = maxHp.get(use.player);
    if (!trigger || !max) continue;
    // Damage that, with the margin, asks for the tank's whole HP.
    const needs = max * (1 - margin);
    const end = trigger.at + WALKING_DEAD_MS;
    const selfHeals = weaving
      .gcdsBetween(use.player, use.at, end)
      .map((at) => ({ at, player: use.player, amount: effect.selfHeal ?? 0 }))
      .filter((e) => e.amount > 0);
    found.push({
      trigger,
      player: use.player,
      selfHeals,
      check: {
        id: -1 - found.length,
        at: end,
        action: use.action,
        name: 'Walking Dead',
        kind: 'tankbuster',
        damageType: null,
        hits: [{ player: use.player, unmitigated: needs, asPlayed: 0, avoidable: false }],
      },
    });
  }
  return found;
}
