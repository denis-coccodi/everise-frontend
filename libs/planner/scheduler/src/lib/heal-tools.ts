import { ActionCatalog, ActionEffect, CatalogAction, TimelinePlayer } from '@everise/core/api-types';
import { DelayedHeal, HealEffect, HealTool, MitigationTool } from './plan.model';
import { ASSUMED, POOLS, playerActions } from './tools';

// Healing over time ticks this often.
export const TICK_MS = 3000;

// Heals that land later than they're used, by action: Earthly Star heals
// fully once the star has grown, on its own when it runs out (20s) or set
// off with Stellar Detonation from 10s; its log calls the heal Stellar
// Explosion. The catalog's potency is the grown star's.
const DELAYED: Record<number, { delaysMs: number[]; release: number; loggedAs: string }> = {
  7439: { delaysMs: [20_000, 10_000], release: 8324, loggedAs: 'Stellar Explosion' },
};

// The catalog's heals that wait for their target's HP, or their end:
// Excogitation ("at 50% HP or below, or when it ends"), Catharsis of
// Corundum and Vigilant ("below 50% HP or when it ends"), Exaltation ("when
// it ends"). Their log names the heal by its status.
const TRIGGER = /^(?:(?:at|below) (\d+)% HP(?: or below)?,? or )?when it ends$/;

// The heals the plan can count on: every heal of the healers' actions, and
// the heals of the mitigations the plan has anyone use. Everyone else's
// healing (a tank's own sustain, Second Wind, Holy Spirit) stays as it was
// played. Heals that depend on what happens later aren't counted yet (Haima's
// stacks, Liturgy of the Bell, Kardia), but for the delayed and triggered
// ones above. Sizes come from the caster's `power` (HP a potency heals) or the
// target's max HP.
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
      const own = power.get(player.id) ?? null;
      const star = DELAYED[action.id];
      const release = star && catalog.actions.find((a) => a.id === star.release);
      let effects = healEffects(action, own, !!star);
      let delayed: DelayedHeal | null =
        star && release
          ? {
              delaysMs: star.delaysMs,
              release: { action: release.id, name: release.name },
              belowShare: null,
              loggedAs: star.loggedAs,
            }
          : null;
      const triggered = effects.length ? null : triggeredHeal(action, own);
      if (triggered) ({ effects, delayed } = triggered);
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
        delayed,
      });
    }
  }
  return tools;
}

// A delayed heal's condition is when it lands, which the plan picks.
function healEffects(action: CatalogAction, power: number | null, delayed: boolean): HealEffect[] {
  const effects: HealEffect[] = [];
  for (const e of action.effects) {
    if (e.target === 'enemies' || (e.condition && !delayed && !ASSUMED(e.condition))) continue;
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

// An action's heal that waits (TRIGGER), for an action with no other heal:
// at the share of max HP its condition says, or when it ends.
function triggeredHeal(
  action: CatalogAction,
  power: number | null,
): { effects: HealEffect[]; delayed: DelayedHeal } | null {
  for (const e of action.effects) {
    const match = e.kind === 'delayedHeal' && e.condition ? TRIGGER.exec(e.condition) : null;
    const size = match && sizeOf(e, power);
    if (!match || !size || !e.durationMs || e.target === 'enemies') continue;
    return {
      effects: [{ target: e.target, size, ticks: 1, status: null, statusId: null }],
      delayed: {
        delaysMs: [e.durationMs],
        release: null,
        belowShare: match[1] ? Number(match[1]) / 100 : null,
        loggedAs: e.status ?? action.name,
      },
    };
  }
  return null;
}

function sizeOf(e: ActionEffect, power: number | null): HealEffect['size'] | null {
  if (e.potency && power) return { hp: e.potency * power };
  if (e.percent && e.of === 'maxHp') return { maxHpShare: e.percent / 100 };
  return null;
}
