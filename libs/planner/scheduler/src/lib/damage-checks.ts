import type { PullTimeline } from '@everise/core/api-types';
import { isMechanicHit } from './mechanics';
import type { Mechanic, MitigationTool, Plan, PlannedUse } from './plan.model';
import { walkingDeads } from './walking-dead';
import type { WalkingDead } from './walking-dead.model';
import type { Weaving } from './weaving';

// The damage outside the mechanics comes in bursts: a bleed's ticks 3 s
// apart, a tank's auto-attacks every couple of seconds. Damage this close
// together is one burst, at most this long, so heals go before each.
const GAP_MS = 3_000;
const LONGEST_MS = 10_000;
// A burst smaller than this share of max HP needs no heal of its own.
const SMALLEST_SHARE = 0.05;
// Nor does one grow past this share: heals before a burst can only fill the
// HP to full, so a heavy bleed (Burnished Glory's ticks, a third of the HP
// each) is a check per tick, with heals between them, as healers do.
const LARGEST_SHARE = 0.5;
// The checks' ids: below 0, apart from the pull's mechanics and the
// Walking Dead checks (-1, -2...).
export const FIRST_DAMAGE_CHECK = -1_000;
export const isDamageCheck = (id: number) => id <= FIRST_DAMAGE_CHECK;

// The heals' checkpoints for the damage that isn't a mechanic's hit
// (damage-over-time ticks, auto-attacks, unnamed attacks), as it was dealt:
// a burst of it on a player is one check at its first hit, taking all of
// it, so the heals before it leave the margin through the whole burst.
// Damage over time is a large share of an ultimate's damage; left out,
// plans let players die to it unseen.
export function damageChecks(timeline: PullTimeline, maxHp: Map<number, number>): Mechanic[] {
  const actionName = new Map(timeline.actions.map((a) => [a.id, a.name]));
  const checks: Mechanic[] = [];
  for (const [player, max] of maxHp) {
    const hits = timeline.damage
      .filter((d) => d.target === player && d.amount > 0 && !isMechanicHit(d, actionName))
      .sort((a, b) => a.at - b.at);
    let burst: typeof hits = [];
    const close = () => {
      const amount = burst.reduce((sum, d) => sum + d.amount, 0);
      if (burst.length && amount >= SMALLEST_SHARE * max) {
        const [first] = burst;
        checks.push({
          id: FIRST_DAMAGE_CHECK - checks.length,
          at: first.at,
          action: first.action,
          name: actionName.get(first.action) ?? 'Damage',
          kind: 'targeted',
          damageType: null,
          hits: [{ player, unmitigated: amount, asPlayed: amount, avoidable: false }],
        });
      }
      burst = [];
    };
    for (const hit of hits) {
      const last = burst.at(-1);
      const total = burst.reduce((sum, d) => sum + d.amount, 0) + hit.amount;
      const apart = last && (hit.at - last.at > GAP_MS || hit.at - burst[0].at > LONGEST_MS);
      if (last && (apart || total > LARGEST_SHARE * max)) close();
      burst.push(hit);
    }
    close();
  }
  return checks.sort((a, b) => a.at - b.at);
}

// What a heal covers, by the pull's mechanics: a Walking Dead check counts
// as the hit that set it off; a damage check isn't a mechanic, so it's left out.
export function coveredMechanics(covers: number[], deads: WalkingDead[]): number[] {
  return covers.filter((id) => !isDamageCheck(id)).map((id) => deads.find((d) => d.check.id === id)?.trigger.id ?? id);
}

// What the heals plan before, in time order: the pull's mechanics, each
// Living Dead's check (the tank must be full again when Walking Dead ends),
// and the damage outside the mechanics.
export function healCheckpoints(
  plan: Plan,
  timeline: PullTimeline,
  maxHp: Map<number, number>,
  margin: number,
  weaving: Weaving,
  mitigationOf: Map<string, MitigationTool>,
) {
  const toolOf = (use: PlannedUse) => mitigationOf.get(`${use.player}:${use.action}`);
  const deads = walkingDeads(plan, toolOf, maxHp, margin, weaving);
  const checks = [...deads.map((d) => d.check), ...damageChecks(timeline, maxHp)];
  return { deads, mechanics: [...plan.mechanics, ...checks].sort((a, b) => a.at - b.at) };
}
