import { ActionCatalog, ActionEffect, CatalogAction, TimelinePlayer } from '@everise/core/api-types';
import { HealEffect, HealTool, MitigationTool } from './plan.model';
import { ASSUMED, POOLS, playerActions } from './tools';

// Healing over time ticks this often.
export const TICK_MS = 3000;

// The heals the plan can count on: every heal of the healers' actions, and
// the heals of the mitigations the plan has anyone use. Everyone else's
// healing (a tank's own sustain, Second Wind, Holy Spirit) stays as it was
// played. Heals that depend on what happens later (Excogitation, Liturgy of
// the Bell, Kardia) aren't counted yet. Sizes come from the caster's
// `power` (HP a potency heals) or the target's max HP.
export function healTools(
  players: TimelinePlayer[],
  catalog: ActionCatalog,
  mitigation: MitigationTool[],
  power: Map<number, number>,
): HealTool[] {
  const planned = new Set(mitigation.map((t) => `${t.player}:${t.action}`));
  const tools: HealTool[] = [];
  for (const player of players) {
    for (const action of playerActions(player, catalog)) {
      if (player.role !== 'healer' && !planned.has(`${player.id}:${action.id}`)) continue;
      const effects = healEffects(action, power.get(player.id) ?? null);
      if (!effects.length) continue;
      tools.push({
        player: player.id,
        action: action.id,
        name: action.name,
        recastMs: action.recastMs,
        charges: action.charges,
        gcd: action.gcd,
        castMs: action.castMs,
        group: `${player.id}:${action.cooldownGroup}`,
        pool: POOLS[action.id] ?? null,
        effects,
      });
    }
  }
  return tools;
}

function healEffects(action: CatalogAction, power: number | null): HealEffect[] {
  const effects: HealEffect[] = [];
  for (const e of action.effects) {
    if (e.target === 'enemies' || (e.condition && !ASSUMED(e.condition))) continue;
    const size = sizeOf(e, power);
    if (!size) continue;
    if (e.kind === 'heal') effects.push({ target: e.target, size, ticks: 1, status: null, statusId: null });
    else if (e.kind === 'regen' && e.durationMs) {
      const ticks = Math.floor(e.durationMs / TICK_MS);
      effects.push({ target: e.target, size, ticks, status: e.status ?? action.name, statusId: e.statusId });
    }
  }
  return effects;
}

function sizeOf(e: ActionEffect, power: number | null): HealEffect['size'] | null {
  if (e.potency && power) return { hp: e.potency * power };
  if (e.percent && e.of === 'maxHp') return { maxHpShare: e.percent / 100 };
  return null;
}
