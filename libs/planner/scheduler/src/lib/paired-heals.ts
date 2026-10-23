import { fitsRecast } from './coverage';
import { HealPairing, HealTool, MitigationTool, PlannedUse } from './plan.model';
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
  if (!events.length) return [];
  // The heal itself takes its slot: an oGCD's weave, a GCD's own.
  const around = [...occupied, { at: use.at, gcd: tool.gcd, castMs: tool.castMs }];
  const healed = use.target ?? use.player;
  const lands = Math.min(...events.map((e) => e.at));
  const reached = [...new Set(events.filter((e) => e.at === lands).map((e) => e.player))];
  const found: Paired[] = [];
  for (const pairing of pairings) {
    if (pairing.player !== use.player || !pairing.heals.includes(use.action)) continue;
    const at = weaving.ogcdBefore(use.player, use.at - 1, use.at - pairing.withinMs + tool.castMs, around);
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
    // On one member (Krasis), only the heal on them.
    const boosted = events.map((e) =>
      pairing.onTarget && e.player !== healed ? e : { ...e, amount: e.amount * pairing.times },
    );
    const target = pairing.onTarget ? healed : null;
    found.push({
      use: { player: use.player, action: pairing.action, name: pairing.name, at, target, covers: use.covers },
      pairing,
      events: [...boosted, ...more],
      barrier: barrierOf(
        pairing,
        tool,
        use,
        boosted.filter((e) => e.at === lands),
      ),
    });
  }
  return found;
}

// How long a pairing's barrier lasts.
const BARRIER_MS = 30_000;

// The barrier a pairing leaves with this heal (`landed`: what it heals each
// member as it lands), as a shield tool and its use; null when it leaves
// none. Its use's action is the pairing's, made negative, apart from it.
function barrierOf(pairing: HealPairing, tool: HealTool, use: PlannedUse, landed: HpEvent[]) {
  const share = pairing.barriers[use.action];
  if (!share || !landed.length) return null;
  const party = tool.effects.some((e) => e.target === 'party');
  const hp = share * Math.min(...landed.map((e) => e.amount));
  const barrier: MitigationTool = {
    player: use.player,
    action: -pairing.action,
    name: pairing.name,
    recastMs: 0,
    charges: 1,
    gcd: false,
    castMs: 0,
    group: `barrier:${use.player}`,
    pool: null,
    grantedBy: null,
    effects: [
      {
        target: party ? 'party' : 'target',
        physical: 0,
        magic: 0,
        shield: { hp },
        hits: 1,
        durationMs: BARRIER_MS,
        status: pairing.name,
        stack: pairing.name,
        invulnerable: null,
      },
    ],
  };
  const at = Math.min(...landed.map((e) => e.at));
  return { use: { ...use, action: barrier.action, name: barrier.name, at, covers: [] }, tool: barrier };
}
