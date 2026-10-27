import {
  DamageType,
  Grant,
  Invulnerability,
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
// took, which statuses were up, and whether an invulnerability was: under
// one that keeps the last HP (Holmgang) the hit still lands; under any
// other it does nothing.
export function projected(
  mechanic: Mechanic,
  hit: MechanicHit,
  uses: PlannedUse[],
  toolOf: (use: PlannedUse) => MitigationTool,
  facts: PullFacts,
): { damage: number; absorbed: number; statuses: string[]; invulnerable: boolean } {
  const strongest = new Map<string, { share: number; status: string }>();
  const shields = new Map<string, { hp: number; status: string }>();
  let invulnerable: MitigationEffect | null = null;
  for (const use of uses) {
    for (const effect of reaches(toolOf(use), use, mechanic, hit)) {
      if (effect.invulnerable) {
        if (!invulnerable?.invulnerable || landsUnder(invulnerable.invulnerable)) invulnerable = effect;
      } else if (effect.shield) {
        if (facts.hitsBetween(hit.player, use.at, mechanic.at) >= effect.hits) continue;
        // A GCD's shield grows with its caster's healing potency buffs.
        const times = toolOf(use).gcd ? facts.shieldTimes(use, uses) : 1;
        const hp = shieldHp(effect.shield, hit.player, facts) * times;
        if (hp > (shields.get(effect.stack)?.hp ?? 0)) shields.set(effect.stack, { hp, status: effect.status });
      } else {
        const share = shareAgainst(effect, mechanic.damageType);
        if (share > (strongest.get(effect.stack)?.share ?? 0))
          strongest.set(effect.stack, { share, status: effect.status });
      }
    }
  }
  if (invulnerable?.invulnerable && !landsUnder(invulnerable.invulnerable)) {
    return { damage: 0, absorbed: 0, statuses: [invulnerable.status], invulnerable: true };
  }
  let damage = hit.unmitigated;
  for (const { share } of strongest.values()) damage *= 1 - share;
  let absorbed = 0;
  for (const { hp } of shields.values()) absorbed += hp;
  absorbed = Math.min(absorbed, damage);
  return {
    damage: Math.round(damage - absorbed),
    absorbed: Math.round(absorbed),
    statuses: [
      ...[...strongest.values()].map((e) => e.status),
      ...[...shields.values()].map((s) => s.status),
      ...(invulnerable ? [invulnerable.status] : []),
    ],
    invulnerable: !!invulnerable,
  };
}

// Whether hits land under an invulnerability, only kept from taking the
// last HP (Holmgang, Living Dead).
export function landsUnder(invulnerability: Invulnerability) {
  return invulnerability === 'lastHp' || invulnerability === 'walkingDead';
}

// The share a mitigation takes off a hit of this type: none of unique
// damage; where the log doesn't say, the smaller of the two.
export function shareAgainst(effect: MitigationEffect, type: DamageType | null) {
  if (type === 'unique') return 0;
  if (type === null) return Math.min(effect.physical, effect.magic);
  return effect[type];
}

// Each player's max HP, how many hits landed on them between two moments
// (from, inclusive, to the second, exclusive), and what a GCD shield's size
// is multiplied by (nothing, unless `shieldTimes` says).
export function pullFacts(
  mechanics: Mechanic[],
  maxHp: Map<number, number>,
  shieldTimes: PullFacts['shieldTimes'] = () => 1,
): PullFacts {
  const times = new Map<number, number[]>();
  for (const m of mechanics) {
    for (const hit of m.hits) times.set(hit.player, [...(times.get(hit.player) ?? []), m.at]);
  }
  return {
    maxHp,
    hitsBetween: (player, from, to) => (times.get(player) ?? []).filter((at) => at >= from && at < to).length,
    shieldTimes,
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

// Whether the pool is full at `at`, with the uses at `times`: a use then
// costs nothing, as what it would gain next is lost otherwise.
export function poolFull(times: number[], at: number, pool: ToolPool) {
  return poolLevel(times, at, pool) >= pool.max;
}

// What the pool holds at `at`, with the uses at `times` before it.
export function poolLevel(times: number[], at: number, pool: ToolPool) {
  let level = pool.max;
  let last = 0;
  for (const time of [...times].filter((t) => t < at).sort((a, b) => a - b)) {
    level = Math.min(pool.max, level + (time - last) / pool.gainMs) - 1;
    last = time;
  }
  return Math.min(pool.max, level + (at - last) / pool.gainMs);
}

// Whether one more use at `at` of an action another grants still has a
// grant for every use: up to `uses` in the `withinMs` after each of `grants`
// (the times the granting action is used).
export function fitsGrant(granted: number[], grants: number[], at: number, grant: Grant) {
  const windows = [...grants].sort((a, b) => a - b).map((from) => ({ from, left: grant.uses }));
  for (const time of [...granted, at].sort((a, b) => a - b)) {
    const window = windows.find((w) => w.left > 0 && time >= w.from && time <= w.from + grant.withinMs);
    if (!window) return false;
    window.left--;
  }
  return true;
}

// Whether one more use at `at` keeps to the recast: with `charges`, no
// stretch as long as the recast holds more uses than charges.
// Whether a tool can't be used at a moment (its `away` spans).
export const isAway = (tool: { away?: { from: number; to: number }[] }, at: number) =>
  !!tool.away?.some((s) => at >= s.from && at < s.to);

export function fitsRecast(times: number[], at: number, recastMs: number, charges: number) {
  const all = [...times, at].sort((a, b) => a - b);
  for (let i = 0; i < all.length; i++) {
    let within = 0;
    for (let j = i; j < all.length && all[j] - all[i] < recastMs; j++) within++;
    if (within > charges) return false;
  }
  return true;
}
