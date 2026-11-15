import { barrierFor } from './barrier-worth';
import { refillsBefore } from './heal-refill';
import { SECT, heavyMechanics, heavyRaidwides, sectRaidwides } from './hit-damage';
import type { HpEvent } from './hp-track.model';
import type { Mechanic, MechanicHit, Plan, PlanOptions } from './plan.model';

// What the heal step (`planHeals`) may refill to full before each mechanic
// (`refills`), and the raidwides everyone goes into shielded as well: the
// heavy ones, and those in a replanned astrologian's Neutral Sect
// (`casters`). `unshielded` says what of a hit no shield takes yet: its
// damage (`damageOf`), less what `extra`'s barriers would save of it;
// nothing once a shield is up (`up` says what the shields up absorb, and
// which), in a Neutral Sect once its barrier is, as it stacks with the
// others. Whether one is changes only as something mitigates: `forget` then.
export function raidwideShields(
  plan: Plan,
  maxHp: Map<number, number>,
  casters: number[],
  options: PlanOptions,
  damageOf: (o: Mechanic, hit: MechanicHit) => number,
  up: (o: Mechanic, hit: MechanicHit) => { absorbed: number; statuses: string[] },
) {
  const sect = sectRaidwides(plan, casters);
  const refills = refillsBefore(new Set([...heavyMechanics(plan, maxHp), ...sect]), options.refillEverywhere);
  const shieldFor = new Set(options.noRaidwideShields ? [] : [...heavyRaidwides(plan, maxHp), ...sect]);
  const shielded = new Map<string, boolean>();
  const unshielded = (o: Mechanic, hit: MechanicHit, extra: HpEvent[]) => {
    const id = `${o.id}:${hit.player}`;
    if (!shielded.has(id))
      shielded.set(id, sect.has(o.id) ? up(o, hit).statuses.includes(SECT) : up(o, hit).absorbed > 0);
    return shielded.get(id) ? 0 : Math.max(0, damageOf(o, hit) - barrierFor(extra, hit.player, o.at));
  };
  return { refills, shieldFor, unshielded, forget: () => shielded.clear() };
}
