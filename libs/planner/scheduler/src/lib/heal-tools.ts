import { ActionCatalog, ActionEffect, CatalogAction, TimelinePlayer } from '@everise/core/api-types';
import { DelayedHeal, HealCost, HealEffect, HealTool, MitigationTool } from './plan.model';
import { ASSUMED, GRANTED, POOLS, playerActions } from './tools';

// Healing over time ticks this often.
export const TICK_MS = 3000;

// GCD heals that cost no damage: Afflatus Solace and Rapture (three of
// them give the Blood Lily that Afflatus Misery's damage refunds), and
// Pneuma (a damage spell that heals).
const NEUTRAL_GCDS = new Set([16531, 16534, 24318]);

// Heals that land later than they're used, by action: Earthly Star heals
// fully once the star has grown, on its own when it runs out (20s) or set
// off with Stellar Detonation from 10s; its log calls the heal Stellar
// Explosion. The catalog's potency is the grown star's.
const DELAYED: Record<number, { delaysMs: number[]; release: number; loggedAs: string }> = {
  7439: { delaysMs: [20_000, 10_000], release: 8324, loggedAs: 'Stellar Explosion' },
};

// The catalog's heals that wait (its delayedHeal effects), by their
// condition; their log names the heal by its status:
// - for their target's HP, or their end: Excogitation ("at 50% HP or below,
//   or when it ends"), Catharsis of Corundum and Vigilant ("below 50% HP or
//   when it ends"), Exaltation ("when it ends");
const TRIGGER = /^(?:(?:at|below) (\d+)% HP(?: or below)?,? or )?when it ends$/;
// - for their end: Horoscope (its upgrade after a Helios isn't counted);
const AT_END = /(?:^|; )when read again or it ends$/;
// - for their end, with a share of the damage taken meanwhile: Macrocosmos;
const DAMAGE_SHARE = /^plus (\d+)% of damage taken meanwhile; when it ends/;
// - for each stack left when another of their effects ends: Haima's and
//   Panhaima's barriers, Liturgy of the Bell's heals on the white mage's
//   hits.
const STACKS_LEFT = 'each stack left when it ends';
const ON_HIT = /^each time the .+ takes damage$/;

// The heals the plan can count on: every heal of the healers' actions, and
// the heals of the mitigations the plan has anyone use. Everyone else's
// healing (a tank's own sustain, Second Wind, Holy Spirit) stays as it was
// played. Heals that depend on what happens later count when they're one of
// the delayed or waiting ones above (Kardia isn't). Sizes come from the
// caster's `power` (HP a potency heals) or the target's max HP.
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
              damageShare: null,
              stacks: null,
              loggedAs: star.loggedAs,
            }
          : null;
      const waiting = effects.length ? null : waitingHeal(action, own);
      if (waiting) ({ effects, delayed } = waiting);
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
        grantedBy: GRANTED[action.id] ?? null,
        cost: costOf(action),
        effects,
        delayed,
      });
    }
  }
  return tools;
}

function costOf(action: CatalogAction): HealCost {
  if (action.gcd) return NEUTRAL_GCDS.has(action.id) ? 'neutral' : 'gcd';
  return POOLS[action.id]?.name === 'Aetherflow' ? 'resource' : 'free';
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

// An action's heal that waits, by its condition (see above), for an action
// with no other heal; null when it has none the plan can count.
function waitingHeal(
  action: CatalogAction,
  power: number | null,
): { effects: HealEffect[]; delayed: DelayedHeal } | null {
  for (const e of action.effects) {
    if (e.kind !== 'delayedHeal' || !e.condition || e.target === 'enemies') continue;
    const size = sizeOf(e, power);
    const delayed = size && waitOf(action, e, power);
    if (!delayed) continue;
    return { effects: [{ target: e.target, size, ticks: 1, status: null, statusId: null }], delayed };
  }
  return null;
}

function waitOf(action: CatalogAction, e: ActionEffect, power: number | null): DelayedHeal | null {
  const condition = e.condition ?? '';
  const base = { release: null, belowShare: null, damageShare: null, stacks: null, loggedAs: e.status ?? action.name };
  const trigger = TRIGGER.exec(condition);
  const share = DAMAGE_SHARE.exec(condition);
  if (e.durationMs && trigger) {
    return { ...base, delaysMs: [e.durationMs], belowShare: trigger[1] ? Number(trigger[1]) / 100 : null };
  }
  if (e.durationMs && AT_END.test(condition)) return { ...base, delaysMs: [e.durationMs] };
  if (e.durationMs && share) return { ...base, delaysMs: [e.durationMs], damageShare: Number(share[1]) / 100 };
  // The stacks, and how long they last, are another effect's.
  const stacked = condition === STACKS_LEFT && action.effects.find((o) => o !== e && o.stacks && o.durationMs);
  if (!stacked || stacked.target === 'enemies') return null;
  const perHit = stacked.kind === 'heal' && ON_HIT.test(stacked.condition ?? '') ? sizeOf(stacked, power) : null;
  return {
    ...base,
    delaysMs: [stacked.durationMs as number],
    stacks: { count: stacked.stacks as number, holder: perHit ? 'self' : stacked.target, perHit },
  };
}

function sizeOf(e: ActionEffect, power: number | null): HealEffect['size'] | null {
  if (e.potency && power) return { hp: e.potency * power };
  if (e.percent && e.of === 'maxHp') return { maxHpShare: e.percent / 100 };
  return null;
}
