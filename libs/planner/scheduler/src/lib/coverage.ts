import { Mechanic, MechanicHit, MitigationTool, PlannedUse, ToolPool } from './plan.model';

// A use's effects reach a hit: on the party, from the enemy, on its user,
// or on the member it was given to; while they last.
export function reaches(tool: MitigationTool, use: PlannedUse, mechanic: Mechanic, hit: MechanicHit) {
  return tool.effects.filter((effect) => {
    if (mechanic.at < use.at || mechanic.at > use.at + effect.durationMs) return false;
    if (effect.target === 'self') return hit.player === use.player;
    if (effect.target === 'target') return hit.player === use.target;
    return true;
  });
}

// What a hit does with the planned uses up: each status counts once (its
// strongest), and they multiply. Also which statuses those were.
export function projected(
  mechanic: Mechanic,
  hit: MechanicHit,
  uses: PlannedUse[],
  toolOf: (use: PlannedUse) => MitigationTool,
): { damage: number; statuses: string[] } {
  const strongest = new Map<string, { share: number; status: string }>();
  for (const use of uses) {
    for (const effect of reaches(toolOf(use), use, mechanic, hit)) {
      if (effect.share > (strongest.get(effect.stack)?.share ?? 0)) strongest.set(effect.stack, effect);
    }
  }
  let damage = hit.unmitigated;
  for (const { share } of strongest.values()) damage *= 1 - share;
  return { damage: Math.round(damage), statuses: [...strongest.values()].map((e) => e.status) };
}

// Whether one more use at `at` leaves the pool enough for every use: it
// starts full and fills one every `gainMs`, up to `max`.
export function fitsPool(times: number[], at: number, pool: ToolPool) {
  let level = pool.max;
  let last = 0;
  for (const time of [...times, at].sort((a, b) => a - b)) {
    level = Math.min(pool.max, level + (time - last) / pool.gainMs);
    last = time;
    if (level < 1) return false;
    level -= 1;
  }
  return true;
}

// Whether one more use at `at` keeps to the recast: with `charges`, no
// stretch as long as the recast holds more uses than charges.
export function fitsRecast(times: number[], at: number, recastMs: number, charges: number) {
  const all = [...times, at].sort((a, b) => a - b);
  for (let i = 0; i < all.length; i++) {
    let within = 0;
    for (let j = i; j < all.length && all[j] - all[i] < recastMs; j++) within++;
    if (within > charges) return false;
  }
  return true;
}
