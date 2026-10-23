import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import type { GcdCast, Occupied } from './weaving.model';

// An oGCD locks its user out of other actions this long: 0.5s, and the
// round trip to the server. Two fit after an instant GCD of 2.5s, one after
// a 1.5s cast, none after a 2s one.
export const WEAVE_MS = 700;
// An instant GCD's own lock, before an oGCD can follow it.
const INSTANT_LOCK_MS = 600;
// A player the pull has no GCDs of: one GCD at a time, this far apart.
const GCD_MS = 2500;

// A stretch of a player's time an action takes.
interface Busy {
  from: number;
  to: number;
}

// When each player can act, with their GCDs as played: the rhythm of their
// rotation (their skill or spell speed in it). An oGCD fits in the weave
// room between two GCDs, after the first's cast bar (or its lock, for an
// instant one) and before the second starts, beside the other oGCDs there;
// a GCD the plan has them use takes the place of one of theirs, its cast
// bar the room after it. The oGCDs they used that the plan doesn't schedule
// (`planned` says which do) keep their place.
export class Weaving {
  private readonly gcds = new Map<number, GcdCast[]>();
  private readonly kept = new Map<number, number[]>();

  // Players' casts, the GCDs among their actions, and which the plan
  // schedules; with none, everyone acts freely.
  constructor(
    casts: PullTimeline['playerCasts'] = [],
    gcdOf = new Map<number, boolean>(),
    planned: (player: number, action: number) => boolean = () => true,
  ) {
    for (const cast of casts) {
      const gcd = gcdOf.get(cast.action);
      if (gcd === undefined) continue;
      if (gcd) push(this.gcds, cast.source, { at: cast.at, castMs: cast.castMs ?? 0 });
      else if (!planned(cast.source, cast.action)) push(this.kept, cast.source, cast.at);
    }
    for (const list of this.gcds.values()) list.sort((a, b) => a.at - b.at);
  }

  static of(timeline: PullTimeline, catalog: ActionCatalog, planned: (player: number, action: number) => boolean) {
    return new Weaving(timeline.playerCasts, new Map(catalog.actions.map((a) => [a.id, a.gcd])), planned);
  }

  // The latest moment from `from` to `at` the player can use an oGCD;
  // null when there's none.
  ogcdBefore(player: number, at: number, from: number, occupied: Occupied[]) {
    const busy = this.all(player, occupied);
    const candidates = [at, ...busy.map((b) => b.from - WEAVE_MS), ...busy.map((b) => b.to)];
    return pick(
      candidates.filter((t) => t >= from && t <= at).sort((a, b) => b - a),
      WEAVE_MS,
      busy,
    );
  }

  // The earliest moment from `at` to `to` the player can use an oGCD; null
  // when there's none.
  ogcdAfter(player: number, at: number, to: number, occupied: Occupied[]) {
    const busy = this.all(player, occupied);
    const candidates = [at, ...busy.map((b) => b.to)];
    return pick(
      candidates.filter((t) => t >= at && t <= to).sort((a, b) => a - b),
      WEAVE_MS,
      busy,
    );
  }

  // The latest moment from `from` to `at` the player can start a GCD of
  // this cast: one of their GCDs, or, with none in the pull, one a GCD from
  // the others planned.
  gcdBefore(player: number, at: number, from: number, castMs: number, occupied: Occupied[]) {
    return this.gcdMoment(
      player,
      castMs,
      occupied,
      (t) => t >= from && t <= at,
      (a, b) => b - a,
      at,
    );
  }

  gcdAfter(player: number, at: number, to: number, castMs: number, occupied: Occupied[]) {
    return this.gcdMoment(
      player,
      castMs,
      occupied,
      (t) => t >= at && t <= to,
      (a, b) => a - b,
      at,
    );
  }

  private gcdMoment(
    player: number,
    castMs: number,
    occupied: Occupied[],
    within: (t: number) => boolean,
    order: (a: number, b: number) => number,
    at: number,
  ) {
    const lock = Math.max(castMs, INSTANT_LOCK_MS);
    const { ogcds } = this.busy(player, occupied);
    const clear = (t: number) => !ogcds.some((b) => b.from < t + lock && b.to > t);
    const played = this.gcds.get(player);
    if (played?.length) {
      const taken = new Set(occupied.filter((o) => o.gcd).map((o) => o.at));
      return (
        played
          .map((g) => g.at)
          .filter((t) => within(t) && !taken.has(t) && clear(t))
          .sort(order)[0] ?? null
      );
    }
    const gcds = occupied.filter((o) => o.gcd).map((o) => o.at);
    const apart = (t: number) => gcds.every((g) => Math.abs(g - t) >= GCD_MS);
    const candidates = [at, ...gcds.flatMap((g) => [g - GCD_MS, g + GCD_MS]), ...ogcds.map((b) => b.to)];
    return candidates.filter((t) => within(t) && apart(t) && clear(t)).sort(order)[0] ?? null;
  }

  // What already takes the player's time: their GCDs (the plan's in place
  // of theirs) to the end of the cast bar or lock, and the oGCDs kept and
  // planned.
  private busy(player: number, occupied: Occupied[]): { gcds: Busy[]; ogcds: Busy[] } {
    const planned = new Map(occupied.filter((o) => o.gcd).map((o) => [o.at, o.castMs]));
    const played = this.gcds.get(player) ?? [];
    const gcds = [
      ...played.map((g) => ({ at: g.at, castMs: planned.get(g.at) ?? g.castMs })),
      ...[...planned].filter(([at]) => !played.some((g) => g.at === at)).map(([at, castMs]) => ({ at, castMs })),
    ];
    const ogcds = [...(this.kept.get(player) ?? []), ...occupied.filter((o) => !o.gcd).map((o) => o.at)];
    return {
      gcds: gcds.map((g) => ({ from: g.at, to: g.at + Math.max(g.castMs, INSTANT_LOCK_MS) })),
      ogcds: ogcds.map((at) => ({ from: at, to: at + WEAVE_MS })),
    };
  }

  private all(player: number, occupied: Occupied[]) {
    const { gcds, ogcds } = this.busy(player, occupied);
    return [...gcds, ...ogcds];
  }
}

// The first of `candidates` where an action this long overlaps nothing busy.
function pick(candidates: number[], length: number, busy: Busy[]) {
  return candidates.find((t) => !busy.some((b) => b.from < t + length && b.to > t)) ?? null;
}

function push<T>(map: Map<number, T[]>, key: number, value: T) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}
