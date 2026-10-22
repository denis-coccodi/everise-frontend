import {
  DamageType,
  Mechanic,
  MechanicHit,
  MitigationEffect,
  MitigationTool,
  PlannedUse,
  ShieldSize,
  ToolPool,
} from './plan.model';
import type { PullFacts } from './coverage.model';

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

// What a hit does with the planned uses up: the mitigations first (each
// status counts once, its strongest, and they multiply), then what the
// shields absorb of the rest (each status once, its biggest; a shield only
// on its first hits on that player since it went up). Also what the shields
// took and which statuses were up.
export function projected(
  mechanic: Mechanic,
  hit: MechanicHit,
  uses: PlannedUse[],
  toolOf: (use: PlannedUse) => MitigationTool,
  facts: PullFacts,
): { damage: number; absorbed: number; statuses: string[] } {
  const strongest = new Map<string, { share: number; status: string }>();
  const shields = new Map<string, { hp: number; status: string }>();
  for (const use of uses) {
    for (const effect of reaches(toolOf(use), use, mechanic, hit)) {
      if (effect.shield) {
        if (facts.hitsBetween(hit.player, use.at, mechanic.at) >= effect.hits) continue;
        const hp = shieldHp(effect.shield, hit.player, facts);
        if (hp > (shields.get(effect.stack)?.hp ?? 0)) shields.set(effect.stack, { hp, status: effect.status });
      } else {
        const share = shareAgainst(effect, mechanic.damageType);
        if (share > (strongest.get(effect.stack)?.share ?? 0))
          strongest.set(effect.stack, { share, status: effect.status });
      }
    }
  }
  let damage = hit.unmitigated;
  for (const { share } of strongest.values()) damage *= 1 - share;
  let absorbed = 0;
  for (const { hp } of shields.values()) absorbed += hp;
  absorbed = Math.min(absorbed, damage);
  return {
    damage: Math.round(damage - absorbed),
    absorbed: Math.round(absorbed),
    statuses: [...[...strongest.values()].map((e) => e.status), ...[...shields.values()].map((s) => s.status)],
  };
}

// The share a mitigation takes off a hit of this type: none of unique
// damage; where the log doesn't say, the smaller of the two.
export function shareAgainst(effect: MitigationEffect, type: DamageType | null) {
  if (type === 'unique') return 0;
  if (type === null) return Math.min(effect.physical, effect.magic);
  return effect[type];
}

// Each player's max HP, and how many hits landed on them between two
// moments (from, inclusive, to the second, exclusive).
export function pullFacts(mechanics: Mechanic[], maxHp: Map<number, number>): PullFacts {
  const times = new Map<number, number[]>();
  for (const m of mechanics) {
    for (const hit of m.hits) times.set(hit.player, [...(times.get(hit.player) ?? []), m.at]);
  }
  return {
    maxHp,
    hitsBetween: (player, from, to) => (times.get(player) ?? []).filter((at) => at >= from && at < to).length,
  };
}

function shieldHp(size: ShieldSize, player: number, facts: PullFacts) {
  return 'hp' in size ? size.hp : size.maxHpShare * (facts.maxHp.get(player) ?? 0);
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
