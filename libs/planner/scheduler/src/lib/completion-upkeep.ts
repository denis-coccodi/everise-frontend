import type { ActionCatalog, PullTimeline, TimelineCast } from '@everise/core/api-types';

// Potions and the like come in the log with ids from here up.
const ITEMS_FROM = 1_000_000;
const SPRINT = 3;
// Swiftcast goes with a raise, not on cooldown.
const SWIFTCAST = 7561;
const LUCID_DREAMING = 7562;
const LUCID_MS = 60_000;
// An astrologian's draws take turns, one every 55 seconds.
const ASTRAL_DRAW = 37017;
const UMBRAL_DRAW = 37018;
const DRAW_MS = 55_000;
// Shorter than this, an action's cooldown isn't what paces it.
const MIN_EVERY_MS = 10_000;
// A tooltip that starts like this is an attack's.
const ATTACK = /^(Deals|Delivers)\b/;

// The players a completed wipe plans only from its wipe point (`late`: not
// asked to be replanned from the pull's start) keep playing their job
// past it: each oGCD they used before it that neither heals, mitigates
// nor attacks (a raid buff, Aetherflow, Dissipation, Lucid Dreaming, Thin
// Air) again on cooldown, from their
// last use to the end; an astrologian's draws in turn 55 seconds apart; a
// healer's Lucid Dreaming each minute: as played, where the log has none
// (a scholar's Aetherflow brings its stacks so).
// The log's MP has none of what they give (Lucid Dreaming, an
// astrologian's draws): the MP model adds it (`MpModel.of`'s `unlogged`).
export function upkeepCasts(timeline: PullTimeline, late: Map<number, number>, catalog: ActionCatalog) {
  return [...late].flatMap(([player, from]) => upkeepOf(timeline, player, from, catalog));
}

// The timeline with those casts (`upkeepCasts`) as if logged.
export function withUpkeep(timeline: PullTimeline, upkeep: TimelineCast[]): PullTimeline {
  if (!upkeep.length) return timeline;
  return { ...timeline, playerCasts: [...timeline.playerCasts, ...upkeep].sort((a, b) => a.at - b.at) };
}

function upkeepOf(timeline: PullTimeline, player: number, from: number, catalog: ActionCatalog): TimelineCast[] {
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const end = timeline.durationMs;
  const own = timeline.playerCasts.filter((c) => c.source === player && c.at <= from).sort((a, b) => a.at - b.at);
  const casts: TimelineCast[] = [];
  const cast = (action: number, at: number) => casts.push({ at, source: player, target: null, action, castMs: null });
  // Again every `every` from `last`, from past the wipe point on.
  const repeat = (action: number, last: number, every: number) => {
    let at = last + every;
    while (at <= from) at += every;
    for (; at <= end; at += every) cast(action, at);
  };
  const skip = new Set([SPRINT, SWIFTCAST, ASTRAL_DRAW, UMBRAL_DRAW]);
  for (const action of new Set(own.map((c) => c.action))) {
    const a = byId.get(action);
    if (!a || a.gcd || action >= ITEMS_FROM || skip.has(action)) continue;
    // Their heals and mitigations the plan plans; their attacks spend what
    // another resource gives (Energy Drain the stacks, Edge of Shadow MP).
    if (a.effects.some((e) => e.kind !== 'mp' && e.kind !== 'mpRegen') || ATTACK.test(a.description ?? '')) continue;
    // On cooldown, from their last.
    const last = own.filter((c) => c.action === action).at(-1)?.at ?? from;
    if (a.recastMs >= MIN_EVERY_MS) repeat(action, last, a.recastMs);
  }
  const draws = own.filter((c) => c.action === ASTRAL_DRAW || c.action === UMBRAL_DRAW);
  const lastDraw = draws[draws.length - 1];
  if (lastDraw) {
    let next = lastDraw.action === ASTRAL_DRAW ? UMBRAL_DRAW : ASTRAL_DRAW;
    for (let at = lastDraw.at + DRAW_MS; at <= end; at += DRAW_MS) {
      if (at > from) cast(next, at);
      next = next === ASTRAL_DRAW ? UMBRAL_DRAW : ASTRAL_DRAW;
    }
  }
  const healer = timeline.players.find((p) => p.id === player)?.role === 'healer';
  // A healer who hadn't used it yet: a few seconds in, then each minute.
  if (healer && !own.some((c) => c.action === LUCID_DREAMING))
    repeat(LUCID_DREAMING, from + 3_000 - LUCID_MS, LUCID_MS);
  return casts;
}
