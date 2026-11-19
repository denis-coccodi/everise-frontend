import { barrierFor } from './barrier-worth';
import { refillsBefore } from './heal-refill';
import { SECT, heavyMechanics, heavyRaidwides, sectRaidwides } from './hit-damage';
import type { HpEvent } from './hp-track.model';
import type { Mechanic, MechanicHit, Plan, PlanOptions } from './plan.model';

// What the heal step (`planHeals`) may refill to full before each mechanic
// (`refills`), and the raidwides everyone goes into shielded as well: every
// raidwide on 4 players or more, whatever its size, as the logs' healers
// shield 60-67% of an ultimate's raidwides with a GCD shield, the light ones
// as often as the heavy (only the heavy ones with `noRaidwideShields:
// 'light'`, none with `true`), and those in a replanned astrologian's
// Neutral Sect (`casters`). `unshielded` says what of a hit no shield takes yet: its
// damage (`damageOf`), less what `extra`'s barriers would save of it;
// nothing once a healer's GCD shield is up (`up` says which shields are up),
// in a Neutral Sect once its barrier is, as it stacks with the others. The
// other barriers (Divine Veil, Shake It Off, Panhaima, Holos...) don't count:
// the logs' sages put up Eukrasian Prognosis over them on nearly every heavy
// raidwide. Whether one is up changes only as something mitigates: `forget` then.
export function raidwideShields(
  plan: Plan,
  maxHp: Map<number, number>,
  casters: number[],
  options: PlanOptions,
  damageOf: (o: Mechanic, hit: MechanicHit) => number,
  up: (o: Mechanic, hit: MechanicHit) => { absorbed: number; statuses: string[] },
) {
  const sect = sectRaidwides(plan, casters);
  const all = options.noRaidwideShields ? [] : everyRaidwide(plan);
  const refills = refillsBefore(new Set([...heavyMechanics(plan, maxHp), ...sect, ...all]), options.refillEverywhere);
  const shieldFor = new Set(
    options.noRaidwideShields === true ? [] : [...heavyRaidwides(plan, maxHp), ...sect, ...all],
  );
  const shielded = new Map<string, boolean>();
  const unshielded = (o: Mechanic, hit: MechanicHit, extra: HpEvent[]) => {
    const id = `${o.id}:${hit.player}`;
    if (!shielded.has(id))
      shielded.set(
        id,
        up(o, hit).statuses.some((s) => (sect.has(o.id) ? s === SECT : GCD_SHIELDS.has(s))),
      );
    return shielded.get(id) ? 0 : Math.max(0, damageOf(o, hit) - barrierFor(extra, hit.player, o.at));
  };
  return { refills, shieldFor, unshielded, forget: () => shielded.clear() };
}

// The healers' GCD shields' barriers: the scholar's, the sage's, and a Neutral Sect's.
const GCD_SHIELDS = new Set(['Galvanize', 'Eukrasian Prognosis', 'Eukrasian Diagnosis', SECT]);

// The raidwides: the mechanics hitting 4 players or more.
const everyRaidwide = (plan: Plan) =>
  plan.mechanics
    .filter((m) => m.kind === 'raidwide' && m.hits.filter((h) => !h.avoidable).length >= 4)
    .map((m) => m.id);
