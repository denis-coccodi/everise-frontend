import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import type { MpShort, PlannedMp } from './mp.model';
import type { Plan } from './plan.model';
import { THIN_AIR, THIN_AIR_MS } from './thin-air';

// The game's MP tick, and the natural one when the log can't tell.
const TICK_MS = 3_000;
const DEFAULT_TICK = 200;
// A Dark Knight's MP spenders the plan may drop for The Blackest Night's
// MP: Edge and Flood of Shadow. One Dark Arts paid for (the log's MP
// didn't drop by most of its cost) frees nothing.
const EDGES = new Set([16470, 16469]);
const PAID = 0.8;

// `dead`: when they lay dead as played, where the plan doesn't prevent it.
type Own = {
  logged: Change[];
  max: number;
  tick: number;
  undone: Change[];
  edges: Change[];
  dead: { from: number; to: number }[];
};

interface Change {
  at: number;
  mp: number;
}

// A replanned player's MP with the plan: the log's MP, changed by what the
// plan does differently. Their uses as played of the actions the plan
// schedules are undone (their cost given back, their MP gain taken away),
// and the plan's own uses spend and gain instead. Where the log's MP sat
// full, a deficit comes back at the player's own tick (MP the log wasted);
// where the plan saves MP, it can't go past the max.
export class MpModel {
  // Moments a use was turned down for MP, by player.
  readonly refused: { player: number; at: number }[] = [];

  private constructor(
    private readonly players: Map<number, Own>,
    // What a use does to the player's MP: what it spends (negative) and
    // gains, as it's used and, for Lucid Dreaming, at each tick after.
    private readonly changesOf: (action: number, player: number, at: number) => Change[],
  ) {}

  // `scheduled`: the plan's player:action keys, whose uses as played it
  // replaces. `alive`: whether the plan keeps a player alive at a moment
  // they died as played (left out, it doesn't).
  static of(
    timeline: PullTimeline,
    catalog: ActionCatalog,
    replanned: number[],
    scheduled: Set<string>,
    alive: (player: number, at: number) => boolean = () => false,
  ) {
    const byId = new Map(catalog.actions.map((a) => [a.id, a]));
    const players = new Map<number, Own>();
    for (const p of timeline.players) {
      // A timeline read before MP was (an older cached one) has none.
      if (!replanned.includes(p.id) || !p.mp?.length || !p.maxMp) continue;
      const edges = timeline.playerCasts
        .filter((c) => c.source === p.id && EDGES.has(c.action))
        .map((c) => ({ at: c.at, mp: byId.get(c.action)?.mpCost ?? 0 }))
        .filter((e) => e.mp && paid(p.mp, e));
      players.set(p.id, { logged: p.mp, max: p.maxMp, tick: tickOf(p.mp), undone: [], edges, dead: [] });
    }
    const model = new MpModel(players, (action, player, at) => {
      const a = byId.get(action);
      if (!a) return [];
      const max = players.get(player)?.max ?? 10_000;
      const gain = a.effects
        .filter((e) => e.kind === 'mp')
        .reduce((sum, e) => sum + (e.percent !== null ? (e.percent / 100) * max : (e.potency ?? 0)), 0);
      const ticks = a.effects
        .filter((e) => e.kind === 'mpRegen')
        .flatMap((e) =>
          Array.from({ length: Math.floor((e.durationMs ?? 0) / TICK_MS) }, (_, k) => ({
            at: at + (k + 1) * TICK_MS,
            mp: (e.potency ?? 0) * 10,
          })),
        );
      const now = gain - a.mpCost;
      return [...(now ? [{ at, mp: now }] : []), ...ticks];
    });
    // Undone: what the played uses did, the other way. A spell a played
    // Thin Air made free cost nothing to give back.
    const thinAir = new Map<number, number>();
    for (const cast of timeline.playerCasts) {
      const own = players.get(cast.source);
      if (!own) continue;
      if (cast.action === THIN_AIR) thinAir.set(cast.source, cast.at);
      const a = byId.get(cast.action);
      const free = !!a?.mpCost && cast.at - (thinAir.get(cast.source) ?? -Infinity) <= THIN_AIR_MS;
      if (free) thinAir.delete(cast.source);
      if (!scheduled.has(`${cast.source}:${cast.action}`)) continue;
      const changes = model.changesOf(cast.action, cast.source, cast.at);
      const undone = changes.map((c) => ({ at: c.at, mp: -c.mp - (free && c.at === cast.at ? (a?.mpCost ?? 0) : 0) }));
      own.undone.push(...undone.filter((c) => c.mp !== 0));
    }
    // A death the plan prevents: the MP it took comes back, with what they
    // would have regained while down, and the raise's MP is taken away. One
    // it doesn't: their MP while down counts for nothing.
    for (const death of timeline.deaths) {
      const own = players.get(death.player);
      if (!own) continue;
      // The log's MP can read 0 a moment before the death itself.
      const last = [...own.logged].reverse().find((r) => r.at < death.at && r.mp > 0);
      if (!last) continue;
      const down = own.logged.find((r) => r.at > last.at)?.at ?? death.at;
      const raised = own.logged.find((r) => r.at > death.at && r.mp > 0);
      if (!alive(death.player, death.at)) {
        own.dead.push({ from: down, to: raised?.at ?? Infinity });
        continue;
      }
      own.undone.push({ at: down, mp: last.mp });
      if (raised) own.undone.push({ at: raised.at, mp: (own.tick * (raised.at - down)) / TICK_MS - raised.mp });
    }
    return model;
  }

  // Whether the player can afford `action` at `at` with their other uses:
  // their MP never runs out from then on, a Dark Knight's Edges dropped if
  // need be (`mayDrop`: not for spare margin). Recorded when not.
  affordable(player: number, action: number, at: number, uses: { action: number; at: number }[], mayDrop = true) {
    const spends = this.changesOf(action, player, at).some((c) => c.mp < 0);
    if (!spends || !this.players.has(player)) return true;
    const kept = this.dropped(player, uses);
    if (this.withDrops(player, [...uses, { action, at }], at, mayDrop ? undefined : kept).ok) return true;
    this.refused.push({ player, at });
    return false;
  }

  // The player's MP with these uses, at each change.
  curve(player: number, uses: { action: number; at: number }[]): Change[] {
    const { dropped } = this.withDrops(player, uses, -Infinity);
    // Between readings, a refund can show over the max for a moment.
    const max = this.players.get(player)?.max ?? Infinity;
    return this.walk(player, uses, dropped).map(({ at, mp }) => ({ at, mp: Math.min(max, Math.max(0, mp)) }));
  }

  // Each of these players' MP with the plan's uses, and the Edges it drops.
  plannedMp(players: number[], uses: { player: number; action: number; at: number }[]): PlannedMp[] {
    return players.map((player) => {
      const own = uses.filter((u) => u.player === player);
      return { player, points: this.curve(player, own), dropped: this.dropped(player, own) };
    });
  }

  // The Edges of Shadow these uses need dropped for MP (their times).
  dropped(player: number, uses: { action: number; at: number }[]): number[] {
    return this.withDrops(player, uses, -Infinity)
      .dropped.map((e) => e.at)
      .sort((a, b) => a - b);
  }

  // Where MP runs out from `from` on, a Dark Knight's latest Edge before
  // it is dropped, as long as that helps; ok when it no longer runs out.
  // `only`: the Edges that may be dropped (by time), when not any.
  private withDrops(player: number, uses: { action: number; at: number }[], from: number, only?: number[]) {
    const own = this.players.get(player);
    const all = own?.edges ?? [];
    const edges = only ? all.filter((e) => only.includes(e.at)) : all;
    const down = (at: number) => !!own?.dead.some((d) => at >= d.from && at < d.to);
    const dropped: Change[] = [];
    for (;;) {
      const low = this.walk(player, uses, dropped).find((c) => c.at >= from && c.mp < 0 && !down(c.at));
      if (!low) return { ok: true, dropped };
      const edge = [...edges].reverse().find((e) => e.at <= low.at && !dropped.includes(e));
      if (!edge) return { ok: false, dropped };
      dropped.push(edge);
    }
  }

  // What the plan's uses do to the player's MP; a spell right after a
  // planned Thin Air costs nothing.
  private planned(player: number, uses: { action: number; at: number }[]): Change[] {
    let thinAir = -Infinity;
    return [...uses]
      .sort((a, b) => a.at - b.at)
      .flatMap((u) => {
        if (u.action === THIN_AIR) thinAir = u.at;
        const changes = this.changesOf(u.action, player, u.at);
        const spends = changes.some((c) => c.at === u.at && c.mp < 0);
        if (!spends || u.at - thinAir > THIN_AIR_MS) return changes;
        thinAir = -Infinity;
        return changes.filter((c) => !(c.at === u.at && c.mp < 0));
      });
  }

  // The log's MP plus the plan's difference, at every reading and use.
  private walk(player: number, uses: { action: number; at: number }[], dropped: Change[] = []): Change[] {
    const own = this.players.get(player);
    if (!own) return [];
    const changes = [...own.undone, ...dropped, ...this.planned(player, uses)].sort((a, b) => a.at - b.at);
    const out: Change[] = [];
    let delta = 0;
    let last = own.logged[0].at;
    let i = 0;
    let logged = own.logged[0].mp;
    for (const reading of own.logged) {
      // The plan's uses before this reading.
      for (; i < changes.length && changes[i].at < reading.at; i++) {
        delta = this.settle(delta, logged, own, changes[i].at - last);
        last = changes[i].at;
        delta += changes[i].mp;
        out.push({ at: changes[i].at, mp: logged + delta });
      }
      delta = this.settle(delta, logged, own, reading.at - last);
      last = reading.at;
      logged = reading.mp;
      // Those at the reading's own moment go with it: one point, not a
      // spike (a death's MP given back at the reading that shows it gone).
      for (; i < changes.length && changes[i].at === reading.at; i++) delta += changes[i].mp;
      delta = Math.min(delta, own.max - logged);
      out.push({ at: reading.at, mp: logged + delta });
    }
    for (; i < changes.length; i++) {
      delta += changes[i].mp;
      out.push({ at: changes[i].at, mp: logged + delta });
    }
    return out;
  }

  // A deficit comes back while the log's MP is full.
  private settle(delta: number, logged: number, own: { max: number; tick: number }, elapsed: number) {
    if (delta >= 0 || logged < own.max) return delta;
    return Math.min(0, delta + (own.tick * elapsed) / TICK_MS);
  }
}

// How soon before a hit a heal turned down for MP counts against it.
const SHORT_WITHIN_MS = 15_000;

// Where the plan wanted a heal the healer hadn't the MP for: each hit left
// short soon after a heal was turned down, once per healer.
export function mpShortOf(mp: MpModel, plan: Plan): MpShort[] {
  const atOf = new Map(plan.mechanics.map((m) => [m.id, m.at]));
  const short = plan.hits.filter((h) => !h.safe).map((h) => ({ at: atOf.get(h.mechanic) ?? 0 }));
  const found = new Map<string, MpShort>();
  for (const r of mp.refused) {
    const hit = short.find((h) => h.at >= r.at && h.at - r.at <= SHORT_WITHIN_MS);
    if (hit) found.set(`${r.player}:${hit.at}`, { player: r.player, at: hit.at });
  }
  return [...found.values()].sort((a, b) => a.at - b.at);
}

// Whether the plan keeps a player alive at a moment: their HP with it then.
export function aliveIn(plan: Plan) {
  return (player: number, at: number) => {
    const points = plan.hp.find((h) => h.player === player)?.points ?? [];
    const hp = [...points].reverse().find((p) => p.at <= at)?.hp;
    return hp !== undefined && hp > 0;
  };
}

// Whether the log's MP dropped for this Edge (not one Dark Arts paid for).
function paid(readings: Change[], edge: Change) {
  const before = [...readings].reverse().find((r) => r.at <= edge.at)?.mp;
  const after = readings.find((r) => r.at > edge.at && r.at - edge.at < TICK_MS)?.mp;
  return before !== undefined && after !== undefined && before - after >= PAID * edge.mp;
}

// The player's natural tick: the commonest small gain between readings
// (Lucid's 550 and the like left out).
function tickOf(readings: Change[]) {
  const counts = new Map<number, number>();
  for (let i = 1; i < readings.length; i++) {
    const gain = readings[i].mp - readings[i - 1].mp;
    if (gain >= 100 && gain <= 400) counts.set(gain, (counts.get(gain) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? DEFAULT_TICK;
}
