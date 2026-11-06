import type { ActionCatalog, PullTimeline, TimelinePlayer } from '@everise/core/api-types';
import { fairyPotency, fairyPower, scholarsFairy } from './fairy-heals';
import type { Plan } from './plan.model';
import { mitigationTools } from './tools';
import { pullLevel } from './trait-levels';

// Replanned scholars' fairies: her heals on her own, as the HP the round
// before (`from`) leaves calls for (as played in the first round), and
// Seraph's Seraphic Veils, uses of a tool the plan never orders, for their
// barriers. `power`: each healer's healing a potency.
export function scholarFairies(
  timeline: PullTimeline,
  scholars: TimelinePlayer[],
  catalog: ActionCatalog,
  power: Map<number, number>,
  maxHp: Map<number, number>,
  dissipations: Map<number, number[]>,
) {
  const heal = fairyPotency(pullLevel(timeline));
  const powers = new Map(scholars.map((s) => [s.id, fairyPower(timeline, s.id, power.get(s.id) ?? null, heal)]));
  const known = new Map([...powers].filter((e): e is [number, number] => e[1] !== null));
  const veils = mitigationTools(scholars, catalog, known, true);
  const fairy = (from?: Plan) => scholarsFairy(timeline, scholars, powers, maxHp, heal, dissipations, from);
  return { veils, fairy };
}
