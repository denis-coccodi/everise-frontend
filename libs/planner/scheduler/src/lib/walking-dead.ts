import { MitigationTool, Plan, PlannedUse } from './plan.model';
import type { WalkingDead } from './walking-dead.model';

// How long Walking Dead lasts: the tank must be healed by their max HP in it.
const WALKING_DEAD_MS = 10_000;

// Each Living Dead in the plan with the hit that sets it off; the checks
// get ids below 0, apart from the pull's mechanics.
export function walkingDeads(
  plan: Plan,
  toolOf: (use: PlannedUse) => MitigationTool | undefined,
  maxHp: Map<number, number>,
  margin: number,
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
    found.push({
      trigger,
      player: use.player,
      check: {
        id: -1 - found.length,
        at: trigger.at + WALKING_DEAD_MS,
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
