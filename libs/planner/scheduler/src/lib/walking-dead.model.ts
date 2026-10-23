import { Mechanic } from './plan.model';
import type { HpEvent } from './hp-track.model';

// A Living Dead the plan has up, and when its Walking Dead ends.
export interface WalkingDead {
  // The hit that sets it off, as the plan counts it: the first on the tank
  // while Living Dead is up.
  trigger: Mechanic;
  player: number;
  // What the tank heals themselves with each of their GCDs meanwhile.
  selfHeals: HpEvent[];
  // A check for the heal plan when Walking Dead ends: the tank must be full
  // by then (healed by their max HP from the 1 HP the hit left), or die.
  check: Mechanic;
}
