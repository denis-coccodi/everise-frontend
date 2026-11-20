import type { ActionEffect, CatalogAction } from '@everise/core/api-types';
import type { HealEffect } from './plan.model';

// The heals that come only with what their user does next, by their
// condition: Bloodwhetting's, Raw Intuition's and Nascent Flash's with each of
// the warrior's weaponskills while it lasts; Tengentsu's Foresight's regen once
// the samurai is hit during Tengentsu, Damnation's Primeval Impulse once hit
// or as Damnation ends.
const EACH_GCD = /^each (?:of the [\w ]+'s )?weaponskills?$/;
const WHEN_HIT = /^when hit(?: or when .+ ends)?$/;
const AT_END = / ends$/;
// The window it's taken in: Tengentsu's ("next attack") where it has one, else its longest mitigation.
const NEXT_ATTACK = 'next attack';

// When such a heal of `action` (`e`) comes; none for any other.
export function conditionalOn(action: CatalogAction, e: ActionEffect): HealEffect['on'] | undefined {
  const condition = e.condition ?? '';
  const gcd = EACH_GCD.test(condition);
  if (!gcd && !WHEN_HIT.test(condition)) return undefined;
  const lasting = action.effects.filter((o) => o.kind === 'mitigation' && o.durationMs).map((o) => o.durationMs ?? 0);
  const next = action.effects.find((o) => o.condition === NEXT_ATTACK && o.durationMs)?.durationMs;
  const withinMs = (gcd ? undefined : next) ?? Math.max(0, ...lasting);
  return withinMs ? { each: gcd ? 'gcd' : 'hit', withinMs, orAtEnd: AT_END.test(condition) } : undefined;
}

// What raises its user's max HP and heals them by as much (Great Nebula,
// Thrill of Battle: "restores the amount increased"), as a heal; none for any other.
export function maxHpHeal(e: ActionEffect): HealEffect | null {
  if (e.kind !== 'maxHp' || !e.percent || e.target !== 'self') return null;
  return { target: 'self', size: { maxHpShare: e.percent / 100 }, ticks: 1, status: null, statusId: null };
}
