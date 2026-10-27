import { ActionCatalog, PullTimeline, TimelineAura } from '@everise/core/api-types';
import { EUKRASIA, EUKRASIA_MS } from './tools';
import type { GcdCast, Occupied } from './weaving.model';

// An oGCD locks its user out of other actions this long: 0.5s, and the
// round trip to the server. Two fit after an instant GCD of 2.5s, one after
// a 1.5s cast, none after a 2s one.
export const WEAVE_MS = 700;
// An instant GCD's own lock, before an oGCD can follow it.
const INSTANT_LOCK_MS = 600;
// A player the pull has no GCDs of: one GCD at a time, this far apart.
const GCD_MS = 2500;
// A GCD this much sooner than the player's usual one after the last only
// landed then: its cast bar began earlier, about this long before.
const LANDED_SHARE = 0.75;
const CAST_BAR_MS = 1500;
// Lightspeed: every spell cast in it is instant (2.5s off each cast).
const LIGHTSPEED = 841;
// How much later than Eukrasia's recast its GCD may come and still be the
// one it augments (latency, a late press).
const EUKRASIA_SLACK_MS = 500;

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
// bar the room after it (never of one that only landed then, its cast begun
// before). A GCD in place of one of theirs that was instant though it has a
// cast time (Swiftcast, Dualcast...), or of any in their Lightspeed, is
// instant too. The oGCDs they used that the plan doesn't schedule
// (`planned` says which do) keep their place.
export class Weaving {
  private readonly gcds = new Map<number, GcdCast[]>();
  private readonly kept = new Map<number, number[]>();
  private readonly fixed = new Map<number, Occupied[]>();

  // Players' casts, the GCDs among their actions, and which the plan
  // schedules; with none, everyone acts freely. `castOf` gives each
  // action's cast time, `auras` the statuses on players (Lightspeed).
  constructor(
    casts: PullTimeline['playerCasts'] = [],
    gcdOf = new Map<number, boolean>(),
    planned: (player: number, action: number) => boolean = () => true,
    castOf = new Map<number, number>(),
    auras: TimelineAura[] = [],
  ) {
    const lightspeed = auras.filter((a) => a.status === LIGHTSPEED && a.target === a.source);
    // A Eukrasia and the GCD it augments are one GCD slot, at the Eukrasia.
    const eukrasia = new Map<number, number>();
    for (const cast of [...casts].sort((a, b) => a.at - b.at)) {
      const gcd = gcdOf.get(cast.action);
      if (gcd === undefined) continue;
      if (gcd && cast.action === EUKRASIA) eukrasia.set(cast.source, cast.at);
      else if (gcd && cast.at - (eukrasia.get(cast.source) ?? -Infinity) <= EUKRASIA_MS + EUKRASIA_SLACK_MS) {
        eukrasia.delete(cast.source);
        continue;
      }
      if (gcd) {
        const castMs = cast.castMs ?? 0;
        const inLightspeed = lightspeed.some((a) => a.target === cast.source && a.from <= cast.at && cast.at <= a.to);
        const instant = inLightspeed || (castMs === 0 && (castOf.get(cast.action) ?? 0) > 0);
        push(this.gcds, cast.source, { at: cast.at, castMs, ...(instant ? { instant } : {}) });
      } else if (!planned(cast.source, cast.action)) push(this.kept, cast.source, cast.at);
    }
    for (const list of this.gcds.values()) {
      list.sort((a, b) => a.at - b.at);
      for (const i of landedGcds(list)) {
        list[i].landed = true;
        // Its cast was only begun before, not made instant.
        delete list[i].instant;
      }
    }
  }

  static of(timeline: PullTimeline, catalog: ActionCatalog, planned: (player: number, action: number) => boolean) {
    return new Weaving(
      timeline.playerCasts,
      new Map(catalog.actions.map((a) => [a.id, a.gcd])),
      planned,
      new Map(catalog.actions.map((a) => [a.id, a.castMs])),
      timeline.auras,
    );
  }

  // What the plan has players use before it plans the rest (an opener's
  // steps, its Afflatus Misery): they keep their place, as the played
  // oGCDs do, a GCD the GCD of theirs it's at.
  keep(uses: ({ player: number } & Occupied)[]) {
    for (const { player, ...use } of uses) push(this.fixed, player, use);
  }

  // How long a GCD of this cast takes at one of the player's GCDs: none
  // where theirs was instant by a buff.
  castAt(player: number, at: number, castMs: number) {
    return this.gcds.get(player)?.find((g) => g.at === at)?.instant ? 0 : castMs;
  }

  // When the player's GCDs as played start, from `from` to `to`.
  gcdsBetween(player: number, from: number, to: number) {
    return (this.gcds.get(player) ?? []).filter((g) => g.at >= from && g.at <= to).map((g) => g.at);
  }

  // The latest moment from `from` to `at` the player can use an oGCD;
  // null when there's none.
  ogcdBefore(player: number, at: number, from: number, occupied: Occupied[]) {
    const busy = this.all(player, this.with(player, occupied));
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
    const busy = this.all(player, this.with(player, occupied));
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
      this.with(player, occupied),
      (t) => t >= from && t <= at,
      (a, b) => b - a,
      at,
    );
  }

  gcdAfter(player: number, at: number, to: number, castMs: number, occupied: Occupied[]) {
    return this.gcdMoment(
      player,
      castMs,
      this.with(player, occupied),
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
    const lock = (t: number) => Math.max(this.castAt(player, t, castMs), INSTANT_LOCK_MS);
    const { ogcds } = this.busy(player, occupied);
    const clear = (t: number) => !ogcds.some((b) => b.from < t + lock(t) && b.to > t);
    const played = this.gcds.get(player);
    if (played?.length) {
      const taken = new Set(occupied.filter((o) => o.gcd).map((o) => o.at));
      return (
        played
          .filter((g) => !g.landed)
          .map((g) => g.at)
          .filter((t) => within(t) && !taken.has(t) && clear(t))
          .sort(order)[0] ?? null
      );
    }
    const gcds = occupied.filter((o) => o.gcd).map((o) => o.at);
    const apart = (t: number) => gcds.every((g) => Math.abs(g - t) >= GCD_MS);
    // Where asked, a GCD from the others, or just after or before an oGCD.
    const candidates = [
      at,
      ...gcds.flatMap((g) => [g - GCD_MS, g + GCD_MS]),
      ...ogcds.flatMap((b) => [b.to, b.from - Math.max(castMs, INSTANT_LOCK_MS)]),
    ];
    return candidates.filter((t) => within(t) && apart(t) && clear(t)).sort(order)[0] ?? null;
  }

  // What already takes the player's time: their GCDs (the plan's in place
  // of theirs) to the end of the cast bar or lock, and the oGCDs kept and
  // planned.
  private busy(player: number, occupied: Occupied[]): { gcds: Busy[]; ogcds: Busy[] } {
    const planned = new Map(occupied.filter((o) => o.gcd).map((o) => [o.at, o.castMs]));
    const played = this.gcds.get(player) ?? [];
    const gcds = [
      ...played.map((g) => {
        const mine = planned.get(g.at);
        return { at: g.at, castMs: mine === undefined ? g.castMs : g.instant ? 0 : mine, landed: g.landed };
      }),
      ...[...planned]
        .filter(([at]) => !played.some((g) => g.at === at))
        .map(([at, castMs]) => ({ at, castMs, landed: false })),
    ];
    const ogcds = [...(this.kept.get(player) ?? []), ...occupied.filter((o) => !o.gcd).map((o) => o.at)];
    return {
      gcds: gcds.map((g) => ({
        from: g.landed ? g.at - CAST_BAR_MS : g.at,
        to: g.at + Math.max(g.castMs, INSTANT_LOCK_MS),
      })),
      ogcds: ogcds.map((at) => ({ from: at, to: at + WEAVE_MS })),
    };
  }

  private with(player: number, occupied: Occupied[]) {
    return [...(this.fixed.get(player) ?? []), ...occupied];
  }

  private all(player: number, occupied: Occupied[]) {
    const { gcds, ogcds } = this.busy(player, occupied);
    return [...gcds, ...ogcds];
  }
}

// Which of a player's GCDs as played (in time order) only landed then: an
// instant one sooner than three quarters of their usual GCD before the
// next, its cast begun earlier (in the countdown).
export function landedGcds(gcds: { at: number; castMs: number | null }[]) {
  const gaps = gcds.slice(1).map((g, i) => g.at - gcds[i].at);
  const usual = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
  return gcds.flatMap((g, i) => (!g.castMs && i < gaps.length && gaps[i] < usual * LANDED_SHARE ? [i] : []));
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
