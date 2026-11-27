import { ActionCatalog, PullTimeline, TimelineAura } from '@everise/core/api-types';
import { EUKRASIA, EUKRASIA_MS } from './tools';
import type { GcdCast, Occupied } from './weaving.model';
import { landedGcds, rhythmFrom, rhythmOf, withRhythm } from './weaving-rhythm';
import { RELEASED } from './heal-tools';
import { withoutFollowUps } from './weaving-follow-ups';
import { insertByAt, near, nearExact, nearSorted } from './weaving-near';
import { weavesFull } from './weaving-slots';

export { withoutFollowUps };

// An oGCD locks its user out of other actions this long: 0.5s, and the
// round trip to the server. Two fit after an instant GCD of 2.5s, one after
// a 1.5s cast, none after a 2s one.
export const WEAVE_MS = 700;
// An instant GCD's own lock, before an oGCD can follow it.
const INSTANT_LOCK_MS = 600;
// A player the pull has no GCDs of: one GCD at a time, this far apart.
const GCD_MS = 2500;
// A GCD that only landed (`landedGcds`) began its cast bar about this long before.
const CAST_BAR_MS = 1500;
// Lightspeed: every spell cast in it is instant (2.5s off each cast).
const LIGHTSPEED = 841;
const LIGHTSPEED_CUT_MS = 2_500;
// How much later than Eukrasia's recast its GCD may come and still be the
// one it augments (latency, a late press).
const EUKRASIA_SLACK_MS = 500;
// A GCD this much later than the player's rhythm came late.
const LATE_SLACK_MS = 200;

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
  // The time each kept oGCD takes: to the end of its weave, or the GCD they
  // pressed after it, as they did, if that came sooner.
  private readonly keptBusy = new Map<number, Busy[]>();
  private readonly fixed = new Map<number, Occupied[]>();
  // Each player's usual GCD, as played.
  private readonly rhythm = new Map<number, number>();
  // Each player's GCDs as played by when they start (the first at each).
  private readonly byAt = new Map<number, Map<number, GcdCast>>();

  // Players' casts, the GCDs among their actions, and which the plan
  // schedules; with none, everyone acts freely. `castOf` gives each
  // action's cast time, `auras` the statuses on players (Lightspeed).
  // `freeFrom` has the players whose GCDs as played stop at a moment (a
  // wipe completed from another group's kill): from then on they act
  // freely, a GCD from the others planned, as one with none in the pull.
  constructor(
    casts: PullTimeline['playerCasts'] = [],
    gcdOf = new Map<number, boolean>(),
    planned: (player: number, action: number) => boolean = () => true,
    castOf = new Map<number, number>(),
    auras: TimelineAura[] = [],
    private readonly freeFrom = new Map<number, number>(),
    downtime: { from: number; to: number }[] = [],
    deaths: { at: number; player: number }[] = [],
    endsAt = Infinity,
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
        const fullMs = castOf.get(cast.action) ?? 0;
        const flags = { ...(instant ? { instant } : {}), ...(inLightspeed ? { lightspeed: true } : {}) };
        push(this.gcds, cast.source, { at: cast.at, castMs, fullMs, ...flags });
      } else if (!planned(cast.source, cast.action)) push(this.kept, cast.source, cast.at);
    }
    for (const [player, list] of this.gcds) {
      list.sort((a, b) => a.at - b.at);
      for (const i of landedGcds(list)) {
        list[i].landed = true;
        // Its cast was only begun before, not made instant.
        delete list[i].instant;
      }
      const died = deaths.filter((d) => d.player === player).map((d) => d.at);
      const rhythm = rhythmOf(list);
      this.rhythm.set(player, rhythm.every);
      const free = freeFrom.get(player);
      const all = [...withRhythm(list, downtime, died), ...rhythmFrom(list, rhythm, free, endsAt, downtime)];
      this.gcds.set(
        player,
        all.sort((a, b) => a.at - b.at),
      );
      const byAt = new Map<number, GcdCast>();
      for (const g of all) if (!byAt.has(g.at)) byAt.set(g.at, g);
      this.byAt.set(player, byAt);
    }
    for (const [player, times] of this.kept) {
      const gcds = (this.gcds.get(player) ?? []).map((g) => g.at).sort((a, b) => a - b);
      const next = (at: number) => gcds.find((g) => g > at) ?? Infinity;
      this.keptBusy.set(
        player,
        times.map((at) => ({ from: at, to: Math.min(at + WEAVE_MS, next(at)) })),
      );
    }
  }

  static of(
    timeline: PullTimeline,
    catalog: ActionCatalog,
    planned: (player: number, action: number) => boolean,
    freeFrom?: Map<number, number>,
    // The players replanned from the start, whom the plan keeps alive: their
    // deaths in the log leave no gap. The others' stand (as played up to
    // the log's end); a wipe's final deaths are gone from a completed one.
    keptAlive: number[] = [],
  ) {
    return new Weaving(
      withoutFollowUps(timeline.playerCasts, catalog),
      new Map(catalog.actions.map((a) => [a.id, a.gcd])),
      // A release (Stellar Detonation) goes with the heal it sets off.
      (player, action) => planned(player, RELEASED.get(action) ?? action),
      new Map(catalog.actions.map((a) => [a.id, a.castMs])),
      timeline.auras,
      freeFrom,
      timeline.downtime ?? [],
      timeline.deaths.filter((d) => !keptAlive.includes(d.player)),
      timeline.durationMs,
    );
  }

  // What the plan has players use before it plans the rest (an opener's
  // steps, its Afflatus Misery): they keep their place, as the played
  // oGCDs do, a GCD the GCD of theirs it's at. In time order (`with`).
  keep(uses: ({ player: number } & Occupied)[]) {
    for (const { player, ...use } of uses) this.fixed.set(player, insertByAt(this.fixed.get(player) ?? [], use));
  }
  // Those kept that the plan gives up again (Rhizomata it drops).
  release(uses: ({ player: number } & Occupied)[]) {
    for (const { player, at } of uses)
      this.fixed.set(
        player,
        (this.fixed.get(player) ?? []).filter((u) => u.at !== at),
      );
  }
  // A player's Lightspeeds as the plan has them, in place of their own: a
  // spell begun in one is 2.5s shorter (instant, for most), its cast's weave
  // room free; one only shorter by theirs as played is cast again.
  lightspeed(player: number, windows: { from: number; to: number }[]) {
    for (const g of this.gcds.get(player) ?? []) {
      if (g.landed || !g.fullMs) continue;
      if (windows.some((w) => w.from <= g.at && g.at <= w.to)) {
        g.castMs = Math.max(0, g.fullMs - LIGHTSPEED_CUT_MS);
        if (!g.castMs) g.instant = true;
      } else if (g.lightspeed) {
        g.castMs = g.fullMs;
        delete g.instant;
      }
    }
  }

  // How long a GCD of this cast takes at one of the player's GCDs: none
  // where theirs was instant by a buff.
  castAt(player: number, at: number, castMs: number) {
    return this.byAt.get(player)?.get(at)?.instant ? 0 : castMs;
  }

  // When the player's GCDs as played start, from `from` to `to`.
  gcdsBetween(player: number, from: number, to: number) {
    return (this.gcds.get(player) ?? []).filter((g) => g.at >= from && g.at <= to).map((g) => g.at);
  }

  // Whether the player's GCDs as played have stopped by `at` (`freeFrom`):
  // past a completed wipe's wipe point, with nobody of their job in the kill.
  freeAt(player: number, at: number) {
    return (this.freeFrom.get(player) ?? Infinity) <= at;
  }

  // The latest moment from `from` to `at` the player can use an oGCD;
  // null when there's none.
  ogcdBefore(player: number, at: number, from: number, occupied: Occupied[]) {
    const { busy, full } = this.all(player, this.with(player, occupied, from, at), from, at);
    const candidates = [at, ...busy.map((b) => b.from - WEAVE_MS), ...busy.map((b) => b.to)];
    return pick(
      candidates.filter((t) => t >= from && t <= at && !full(t)).sort((a, b) => b - a),
      WEAVE_MS,
      busy,
    );
  }

  // The earliest moment from `at` to `to` the player can use an oGCD; null
  // when there's none.
  ogcdAfter(player: number, at: number, to: number, occupied: Occupied[]) {
    const { busy, full } = this.all(player, this.with(player, occupied, at, to), at, to);
    const candidates = [at, ...busy.map((b) => b.to)];
    return pick(
      candidates.filter((t) => t >= at && t <= to && !full(t)).sort((a, b) => a - b),
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
      this.with(player, occupied, from, at),
      (t) => t >= from && t <= at,
      (a, b) => b - a,
      at,
      [from, at],
    );
  }

  gcdAfter(player: number, at: number, to: number, castMs: number, occupied: Occupied[]) {
    return this.gcdMoment(
      player,
      castMs,
      this.with(player, occupied, at, to),
      (t) => t >= at && t <= to,
      (a, b) => a - b,
      at,
      [at, to],
    );
  }

  private gcdMoment(
    player: number,
    castMs: number,
    occupied: Occupied[],
    within: (t: number) => boolean,
    order: (a: number, b: number) => number,
    at: number,
    [lo, hi]: [number, number],
  ) {
    const lock = (t: number) => Math.max(this.castAt(player, t, castMs), INSTANT_LOCK_MS);
    occupied = near(occupied, lo, hi);
    const { ogcds } = this.busy(player, occupied, lo, hi);
    const clear = (t: number) => !ogcds.some((b) => b.from < t + lock(t) && b.to > t);
    const free = this.freeFrom.get(player);
    const everyGcd = this.gcds.get(player) ?? [];
    const played = nearSorted(this.gcds.get(player) ?? [], lo, hi);
    const taken = new Set(occupied.filter((o) => o.gcd).map((o) => o.at));
    const theirs = played
      .filter((g) => !g.landed && (free === undefined || g.at < free || g.filled))
      .map((g) => g.at)
      .filter((t) => within(t) && !taken.has(t) && clear(t));
    // In the countdown, they're free to act: a GCD from their others.
    if (everyGcd.length && free === undefined && at >= 0) return theirs.sort(order)[0] ?? null;
    const gcds = [...occupied.filter((o) => o.gcd).map((o) => o.at), ...played.map((g) => g.at)];
    const apart = (t: number) => gcds.every((g) => Math.abs(g - t) >= GCD_MS);
    // Where asked, a GCD from the others, or just after or before an oGCD.
    const candidates = [
      at,
      ...gcds.flatMap((g) => [g - GCD_MS, g + GCD_MS]),
      ...ogcds.flatMap((b) => [b.to, b.from - Math.max(castMs, INSTANT_LOCK_MS)]),
    ];
    const countdown = (t: number) => t < 0 || !everyGcd.length || free !== undefined;
    const freely = candidates.filter(
      (t) => within(t) && apart(t) && clear(t) && t >= (free ?? -Infinity) && countdown(t),
    );
    return [...theirs, ...freely].sort(order)[0] ?? null;
  }

  // What already takes the player's time: their GCDs (the plan's in place
  // of theirs) to the end of the cast bar or lock, and the oGCDs kept and
  // planned: those near `lo` to `hi`.
  private busy(player: number, occupied: Occupied[], lo: number, hi: number): { gcds: Busy[]; ogcds: Busy[] } {
    occupied = near(occupied, lo, hi);
    const planned = new Map(occupied.filter((o) => o.gcd).map((o) => [o.at, o.castMs]));
    const played = nearSorted(this.gcds.get(player) ?? [], lo, hi);
    const playedAt = new Set(played.map((g) => g.at));
    const gcds = [
      ...played.map((g) => {
        const mine = planned.get(g.at);
        return { at: g.at, castMs: mine === undefined ? g.castMs : g.instant ? 0 : mine, landed: g.landed };
      }),
      ...[...planned].filter(([at]) => !playedAt.has(at)).map(([at, castMs]) => ({ at, castMs, landed: false })),
    ];
    const kept = near(this.keptBusy.get(player) ?? [], lo, hi, (b) => b.from);
    const ogcds = [...kept, ...occupied.filter((o) => !o.gcd).flatMap((o) => weaves(o.at, o.firstAt))];
    // A GCD that came late leaves no more weave room than one on time: the
    // rest is the player being slow, not free time (an oGCD always comes
    // after a GCD, two at most). A longer gap is downtime or a death.
    const every = this.rhythm.get(player);
    const sorted = [...gcds].sort((a, b) => a.at - b.at);
    const late = every
      ? sorted.slice(1).flatMap((g, i) => {
          const gap = g.at - sorted[i].at;
          return gap > every + LATE_SLACK_MS && gap < 2 * every ? [{ from: sorted[i].at + every, to: g.at }] : [];
        })
      : [];
    return {
      gcds: [
        ...gcds.map((g) => ({
          from: g.landed ? g.at - CAST_BAR_MS : g.at,
          to: g.at + Math.max(g.castMs, INSTANT_LOCK_MS),
        })),
        ...late,
      ],
      ogcds,
    };
  }
  // What the plan already has the player use near `lo` to `hi`: what it kept first (`keep`), then `occupied`.
  private with(player: number, occupied: Occupied[], lo: number, hi: number) {
    return [...nearExact(this.fixed.get(player) ?? [], lo, hi), ...near(occupied, lo, hi)];
  }

  private all(player: number, occupied: Occupied[], lo: number, hi: number) {
    const { gcds, ogcds } = this.busy(player, occupied, lo, hi);
    // What takes their time, and the gaps between two GCDs with no weave slot left.
    return { busy: [...gcds, ...ogcds], full: weavesFull(gcds, ogcds) };
  }
}

// The first of `candidates` where an action this long overlaps nothing busy.
function pick(candidates: number[], length: number, busy: Busy[]) {
  return candidates.find((t) => !busy.some((b) => b.from < t + length && b.to > t)) ?? null;
}

// The weave an oGCD takes, and its first press's (Tempera Coat: `first-press.ts`).
const weaves = (at: number, firstAt?: number) =>
  [at, ...(firstAt === undefined ? [] : [firstAt])].map((t) => ({ from: t, to: t + WEAVE_MS }));

function push<T>(map: Map<number, T[]>, key: number, value: T) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}
