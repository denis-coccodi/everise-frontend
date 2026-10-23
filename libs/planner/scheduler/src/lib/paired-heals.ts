import { fitsRecast } from './coverage';
import { HealPairing, HealTool, PlannedUse } from './plan.model';
import { Weaving } from './weaving';
import type { Paired } from './heal-plan.model';
import type { HpEvent } from './hp-track.model';
import type { Occupied } from './weaving.model';

// The ways a use of a GCD heal can go with one of its user's pairings
// (Plenary Indulgence before a Medica): each up in a weave slot before the
// heal's cast, within its window and as its recast allows (`groupTimes`
// says when its group was used), and the heal's `events` with it, bigger
// or with Confession's heal on each member the heal reaches as it lands.
export function pairingsFor(
  pairings: HealPairing[],
  tool: HealTool,
  use: PlannedUse,
  events: HpEvent[],
  occupied: Occupied[],
  groupTimes: (group: string) => number[],
  weaving: Weaving,
  maxHp: Map<number, number>,
): Paired[] {
  if (!tool.gcd || !events.length) return [];
  const lands = Math.min(...events.map((e) => e.at));
  const reached = [...new Set(events.filter((e) => e.at === lands).map((e) => e.player))];
  const found: Paired[] = [];
  for (const pairing of pairings) {
    if (pairing.player !== use.player || !pairing.heals.includes(use.action)) continue;
    const at = weaving.ogcdBefore(use.player, use.at - 1, use.at - pairing.withinMs + tool.castMs, occupied);
    if (at === null || at < 0 || !fitsRecast(groupTimes(pairing.group), at, pairing.recastMs, pairing.charges)) {
      continue;
    }
    const { extra } = pairing;
    const more = extra
      ? reached.map((player) => ({
          at: lands,
          player,
          amount: 'hp' in extra ? extra.hp : extra.maxHpShare * (maxHp.get(player) ?? 0),
        }))
      : [];
    found.push({
      use: { player: use.player, action: pairing.action, name: pairing.name, at, target: null, covers: use.covers },
      pairing,
      events: [...events.map((e) => ({ ...e, amount: e.amount * pairing.times })), ...more],
    });
  }
  return found;
}
