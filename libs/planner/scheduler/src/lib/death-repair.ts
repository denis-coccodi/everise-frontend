import type { Hold } from './death-repair.model';
import type { Plan, PlannedUse } from './plan.model';

// A cooldown counts as big from this recast on: the ones a plan can't have
// twice within a mechanic or two.
const BIG_RECAST_MS = 60_000;
// A use this close before a death already covers its hit (mitigations last
// 10 to 20s): it stays.
const COVERS_MS = 15_000;
// Plans tried at most, so a pull with deaths takes a few plans' time more.
const TRIES = 6;

// The plan with its deaths repaired where moving one big cooldown saves
// someone: a use spent shortly before a death, still recasting when it
// lands, is held back (`Hold`) and the pull planned again (`replanWith`),
// the latest such use first. A plan with fewer deaths that is `better` is
// kept, and its deaths tried again, until none is left or nothing helps.
// The whole-plan strategies trade deaths between mechanics; this mends one
// at a time.
export function repairDeaths(
  plan: Plan,
  replanWith: (holds: Hold[]) => Plan,
  recastOf: (action: number) => number,
  better: (a: Plan, b: Plan) => boolean,
): Plan {
  let best = plan;
  let holds: Hold[] = [];
  const tried = new Set<string>();
  for (let tries = 0; best.deaths?.length && tries < TRIES;) {
    const next = heldFor(best, recastOf).filter((h) => !tried.has(holdKey(h)));
    if (!next.length) break;
    let kept = false;
    for (const hold of next.slice(0, TRIES - tries)) {
      tried.add(holdKey(hold));
      tries++;
      const replanned = replanWith([...holds, hold]);
      if ((replanned.deaths?.length ?? 0) < (best.deaths?.length ?? 0) && better(replanned, best)) {
        [best, holds, kept] = [replanned, [...holds, hold], true];
        break;
      }
    }
    if (!kept) break;
  }
  return best;
}

// The holds worth trying for the plan's deaths, the latest use first: each
// big cooldown of a replanned player used before a death, but not so close
// that it covers it, and still recasting when the death's hit lands.
export function heldFor(plan: Plan, recastOf: (action: number) => number): Hold[] {
  const replanned = new Set(plan.replanned ?? []);
  const holds = new Map<string, Hold & { used: number }>();
  for (const death of plan.deaths ?? []) {
    for (const use of plan.uses) {
      const recast = recastOf(use.action);
      if (!replanned.has(use.player) || !movable(use) || recast < BIG_RECAST_MS) continue;
      if (use.at >= death.at - COVERS_MS || use.at + recast <= death.at) continue;
      const hold = { player: use.player, action: use.action, from: death.at - recast, to: death.at - COVERS_MS };
      holds.set(holdKey(hold), { ...hold, used: use.at });
    }
  }
  return [...holds.values()].sort((a, b) => b.used - a.used).map(({ used: _, ...hold }) => hold);
}

// The plan's own uses: not an opener step, an edit, a played or burst use,
// a raise, a refill or a Limit Break.
function movable(use: PlannedUse) {
  return !use.opener && !use.edited && !use.played && !use.burst && !use.raise && !use.refill && !use.gauge;
}

function holdKey(h: Hold) {
  return `${h.player}:${h.action}:${h.from}`;
}

// The tools with the held cooldowns kept out of their windows (`away`).
export function withHolds<T extends { player: number; action: number; away?: { from: number; to: number }[] }>(
  tools: T[],
  holds: Hold[] | undefined,
): T[] {
  if (!holds?.length) return tools;
  return tools.map((t) => {
    const held = holds.filter((h) => h.player === t.player && h.action === t.action);
    return held.length ? { ...t, away: [...(t.away ?? []), ...held.map(({ from, to }) => ({ from, to }))] } : t;
  });
}
