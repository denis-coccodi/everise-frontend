import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import type { MpShort } from './mp.model';
import type { Plan } from './plan.model';

// The game's MP tick, and the natural one when the log can't tell.
const TICK_MS = 3_000;
const DEFAULT_TICK = 200;

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
    private readonly players: Map<number, { logged: Change[]; max: number; tick: number; undone: Change[] }>,
    private readonly costOf: (action: number, player: number) => number,
  ) {}

  // `scheduled`: the plan's player:action keys, whose uses as played it
  // replaces.
  static of(timeline: PullTimeline, catalog: ActionCatalog, replanned: number[], scheduled: Set<string>) {
    const byId = new Map(catalog.actions.map((a) => [a.id, a]));
    const players = new Map<number, { logged: Change[]; max: number; tick: number; undone: Change[] }>();
    for (const p of timeline.players) {
      // A timeline read before MP was (an older cached one) has none.
      if (!replanned.includes(p.id) || !p.mp?.length || !p.maxMp) continue;
      players.set(p.id, { logged: p.mp, max: p.maxMp, tick: tickOf(p.mp), undone: [] });
    }
    const model = new MpModel(players, (action, player) => {
      const a = byId.get(action);
      if (!a) return 0;
      const max = players.get(player)?.max ?? 10_000;
      const gain = a.effects
        .filter((e) => e.kind === 'mp')
        .reduce((sum, e) => sum + (e.percent !== null ? (e.percent / 100) * max : (e.potency ?? 0)), 0);
      return a.mpCost - gain;
    });
    for (const cast of timeline.playerCasts) {
      const own = players.get(cast.source);
      if (!own || !scheduled.has(`${cast.source}:${cast.action}`)) continue;
      const cost = model.costOf(cast.action, cast.source);
      if (cost) own.undone.push({ at: cast.at, mp: cost });
    }
    return model;
  }

  // Whether the player can afford `action` at `at` with their other uses:
  // their MP never runs out from then on. Recorded when not.
  affordable(player: number, action: number, at: number, uses: { action: number; at: number }[]) {
    const cost = this.costOf(action, player);
    if (cost <= 0 || !this.players.has(player)) return true;
    const lowest = this.lowestFrom(player, at, [...uses, { action, at }]);
    if (lowest >= 0) return true;
    this.refused.push({ player, at });
    return false;
  }

  // The player's MP with these uses, at each change.
  curve(player: number, uses: { action: number; at: number }[]): Change[] {
    return this.walk(player, uses).map(({ at, mp }) => ({ at, mp: Math.max(0, mp) }));
  }

  private lowestFrom(player: number, from: number, uses: { action: number; at: number }[]) {
    return Math.min(
      ...this.walk(player, uses)
        .filter((c) => c.at >= from)
        .map((c) => c.mp),
    );
  }

  // The log's MP plus the plan's difference, at every reading and use.
  private walk(player: number, uses: { action: number; at: number }[]): Change[] {
    const own = this.players.get(player);
    if (!own) return [];
    const changes = [
      ...own.undone,
      ...uses.map((u) => ({ at: u.at, mp: -this.costOf(u.action, player) })).filter((c) => c.mp !== 0),
    ].sort((a, b) => a.at - b.at);
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
