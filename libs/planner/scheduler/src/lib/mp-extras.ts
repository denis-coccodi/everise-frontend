import type { ActionCatalog, TimelineCast } from '@everise/core/api-types';
import { ASTRAL_DRAW } from './burst';
import { damageMpPerGcd } from './completion-mp';
import { upkeepCasts } from './completion-upkeep';
import { LUCID_DREAMING } from './lucid';
import type { MpExtras } from './mp.model';
import { UMBRAL_DRAW } from './opener-presets';
import type { Opening } from './openers.model';
import type { ReferencedTimeline } from './reference-damage.model';

// What the MP model needs besides the log's MP (`MpExtras`):
// - the plan's own uses that give MP and are known before it plans
//   (`fixed`): each replanned astrologian's draws as they come, and past a
//   completed wipe's wipe point a scholar's Aetherflows as their opener has
//   them (before it, the log's are in their MP);
// - past that wipe point, where no log has the players' MP: the upkeep of
//   those planned from there (`upkeep`), a Lucid Dreaming each minute for
//   those replanned from the start (`fromStart`) until the plan places its
//   own, and each player's damage spells' MP a GCD (their pace before it).
export function mpExtras(
  timeline: ReferencedTimeline,
  catalog: ActionCatalog,
  opening: Opening,
  upkeep: TimelineCast[],
  fromStart: number[],
): MpExtras {
  const from = timeline.completion?.from ?? Infinity;
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const gives = (action: number) => !!byId.get(action)?.effects.some((e) => e.kind === 'mp' || e.kind === 'mpRegen');
  const cast = (source: number, action: number, at: number): TimelineCast => ({
    at,
    source,
    target: null,
    action,
    castMs: null,
  });
  const draws = [...opening.draws].flatMap(([p, d]) => [
    ...d.astral.map((at) => cast(p, ASTRAL_DRAW, at)),
    ...d.umbral.map((at) => cast(p, UMBRAL_DRAW, at)),
  ]);
  const drawn = new Set(draws.map((d) => d.action));
  const past = opening.uses
    .filter((u) => u.at > from && fromStart.includes(u.player) && gives(u.action) && !drawn.has(u.action))
    .map((u) => cast(u.player, u.action, u.at));
  const fixed = [...draws.filter((d) => gives(d.action)), ...past];
  if (from === Infinity) return { from, fixed, unlogged: [], perGcd: new Map() };
  const theirs = new Map(fromStart.map((p) => [p, from]));
  const lucids = upkeepCasts(timeline, theirs, catalog).filter((c) => c.action === LUCID_DREAMING);
  return {
    from,
    fixed,
    unlogged: [...upkeep, ...lucids],
    perGcd: new Map(timeline.players.map((p) => [p.id, damageMpPerGcd(timeline, p, from, catalog)])),
  };
}
