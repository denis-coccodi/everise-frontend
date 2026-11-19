import { pickBest } from './mitigation-moments';
import type { Candidate } from './mitigation-plan.model';
import type { Mechanic, MechanicHit, MitigationTool, PlannedUse } from './plan.model';

// A tank's short cooldown: The Blackest Night, Holy Sheltron or Sheltron, Heart of Corundum or Heart of Stone,
// Bloodwhetting or Raw Intuition; up on them, the other tank's Intervention or Nascent Flash counts too.
export const SHORT_COOLDOWNS = new Set([7393, 25746, 3542, 25758, 16161, 25751, 3551]);
const FROM_THE_OTHER_TANK = [7382, 16464];
// Their long one, which it goes with: Rampart, or the 40% one (Guardian or Sentinel, Damnation or Vengeance, Shadowed
// Vigil or Shadow Wall, Great Nebula or Nebula), or a warrior's Thrill of Battle. Not the weaker ones the guides pair
// with those (Oblation, Dark Mind, Camouflage...), which the hits that need more still get.
export const LONG_COOLDOWNS = new Set([7531, 36920, 17, 36923, 44, 40, 36927, 3636, 36935, 16148]);
const RAMPART = 7531;
// A gunbreaker's Rampart goes with Camouflage.
const WITH_RAMPART = new Set([16140]);
// A buster this big (unmitigated, a share of max HP) or bigger: in 88 kills' logs, those of 60% or more had a long
// cooldown or an invulnerability on the tank 86-92% of the time, those under 40% 28%.
const HEAVY = 0.6;

// Every heavy tank buster (`HEAVY`) gets a short and a long cooldown on the tank it hits, as The Balance's guides
// pair them ("Rampart and Camoflauge tied with Heart of Corundum, or Nebula tied with Heart of Corundum"; a warrior's
// Bloodwhetting with Rampart, Thrill of Battle or Damnation, both bigger ones only on bigger hits), but where an
// invulnerability takes it, or one of that kind is up already: the most dangerous busters first (`order`), each the
// tank's own of each kind that does the most (`best`), before anything else is planned. Spent on a bigger hit first,
// a tank's cooldowns had left the next buster with none (a Dancing Mad gunbreaker took Chaotic Flare with only Sacred
// Soil). On a hit they leave killing (`killing`), they go back where one of the tank's invulnerabilities fits for it
// (`saved`): it will take the hit, and they'd be spent for nothing. Where none does (their Living Dead used just
// before), they stay, for the rest of the plan to add to: taken back, a Dancing Mad dark knight died to Fell Forces.
export function shortAndLong(
  order: Mechanic[],
  tools: MitigationTool[],
  maxHp: Map<number, number>,
  uses: PlannedUse[],
  {
    covered,
    best,
    add,
    killing,
    saved,
  }: {
    // Whether the hit is covered: by an invulnerability, or by a use of one of these actions.
    covered: (m: Mechanic, h: MechanicHit, actions: Set<number>) => boolean;
    best: (m: Mechanic, t: MitigationTool, wanted: (h: MechanicHit) => boolean) => Candidate | null;
    add: (c: Candidate) => void;
    // Whether the hit still kills.
    killing: (m: Mechanic) => (h: MechanicHit) => boolean;
    // Whether one of the tank's invulnerabilities fits for it.
    saved: (m: Mechanic, h: MechanicHit) => boolean;
  },
) {
  for (const m of order.filter((o) => o.kind === 'tankbuster')) {
    for (const h of m.hits.filter((x) => !x.avoidable && x.unmitigated >= HEAVY * (maxHp.get(x.player) ?? Infinity))) {
      const before = uses.length;
      for (const kind of [SHORT_COOLDOWNS, LONG_COOLDOWNS]) {
        if (covered(m, h, kind === SHORT_COOLDOWNS ? new Set([...kind, ...FROM_THE_OTHER_TANK]) : kind)) continue;
        const own = tools.filter((t) => t.player === h.player && kind.has(t.action));
        const pick = pickBest(own.map((t) => best(m, t, (x) => x.player === h.player)));
        if (pick) add(pick);
        if (pick?.tool.action !== RAMPART) continue;
        const along = tools.filter((t) => t.player === h.player && WITH_RAMPART.has(t.action));
        const also = pickBest(along.map((t) => best(m, t, (x) => x.player === h.player)));
        if (also) add(also);
      }
      if (killing(m)(h) && saved(m, h)) uses.splice(before);
    }
  }
}
