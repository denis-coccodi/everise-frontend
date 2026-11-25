import type { HpEvent, HpCheckpoint } from './hp-track.model';

// Each player's HP over the pull: from full at the start, down with every
// hit and up with every heal, never below 0 (or an event's floor) or above
// their max HP.
export class HpTrack {
  private readonly events = new Map<number, HpEvent[]>();
  // Each player's HP after each of their events (`checkpoint`), right for
  // the first `known` of them: an event added earlier undoes those after it.
  private readonly hps = new Map<number, number[]>();
  private readonly known = new Map<number, number>();

  constructor(
    private readonly maxHp: Map<number, number>,
    events: HpEvent[],
  ) {
    this.add(events);
  }

  add(events: HpEvent[]) {
    for (const event of events) {
      if (!this.maxHp.has(event.player)) continue;
      const list = this.events.get(event.player) ?? [];
      // After every event at the same moment, before any later one.
      let i = list.length;
      while (i > 0 && list[i - 1].at > event.at) i--;
      list.splice(i, 0, event);
      this.events.set(event.player, list);
      this.known.set(event.player, Math.min(this.known.get(event.player) ?? 0, i));
    }
  }

  // Takes back events added before (these same objects): a use the plan moved (Sacred Soil's regen).
  remove(events: HpEvent[]) {
    for (const event of events) {
      const list = this.events.get(event.player) ?? [];
      const i = list.indexOf(event);
      if (i < 0) continue;
      list.splice(i, 1);
      this.known.set(event.player, Math.min(this.known.get(event.player) ?? 0, i));
    }
  }

  // The damage the player took after `from`, up to `to` (inclusive).
  damageBetween(player: number, from: number, to: number) {
    let damage = 0;
    for (const e of this.events.get(player) ?? []) if (e.at > from && e.at <= to && e.amount < 0) damage -= e.amount;
    return damage;
  }

  // The first moment from `from` to `to` (inclusive) that leaves the player
  // at `hp` or below: `from` itself when they already are; null when none
  // does.
  firstAtOrBelow(player: number, from: number, to: number, hp: number): number | null {
    const start = this.checkpoint(player, from);
    if (!start) return null;
    if (start.hp <= hp) return from;
    const max = this.maxHp.get(player) as number;
    const list = this.events.get(player) ?? [];
    let level = start.hp;
    for (let i = start.next; i < list.length && list[i].at <= to; i++) {
      level = this.step(level, list[i], max);
      if (level <= hp) return list[i].at;
    }
    return null;
  }

  // The player's HP after each moment something changes it, from full at the
  // start; none for a player without a max HP.
  points(player: number): { at: number; hp: number }[] {
    const max = this.maxHp.get(player);
    if (max === undefined) return [];
    const points: { at: number; hp: number }[] = [{ at: 0, hp: max }];
    let hp = max;
    for (const event of this.events.get(player) ?? []) {
      hp = this.step(hp, event, max);
      const last = points.at(-1) as { at: number; hp: number };
      if (last.at === event.at) last.hp = hp;
      else if (last.hp !== hp) points.push({ at: event.at, hp });
    }
    return points;
  }

  // The HP healing gave the player back from `from` to `to` (both inclusive): what each heal raised their HP by,
  // whatever hits them meanwhile (not a hit's damage a mitigation takes back: `back`).
  restoredBetween(player: number, from: number, to: number) {
    const max = this.maxHp.get(player);
    if (max === undefined) return 0;
    let [hp, restored] = [max, 0];
    for (const event of this.events.get(player) ?? []) {
      const next = this.step(hp, event, max);
      if (event.at >= from && event.at <= to && event.amount > 0 && !event.back) restored += next - hp;
      hp = next;
    }
    return restored;
  }

  checkpoint(player: number, at: number): HpCheckpoint | null {
    const max = this.maxHp.get(player);
    if (max === undefined) return null;
    const list = this.events.get(player) ?? [];
    // The events up to `at` (inclusive), found by halving.
    let [a, next] = [0, list.length];
    while (a < next) {
      const m = (a + next) >> 1;
      if (list[m].at <= at) a = m + 1;
      else next = m;
    }
    const hps = this.hps.get(player) ?? [];
    this.hps.set(player, hps);
    let known = this.known.get(player) ?? 0;
    for (; known < next; known++) hps[known] = this.step(known ? hps[known - 1] : max, list[known], max);
    this.known.set(player, known);
    return { player, at, hp: next ? hps[next - 1] : max, next };
  }

  // Their HP just before `at`, from a checkpoint, with `extra` events (all
  // after the checkpoint) as well.
  before(from: HpCheckpoint, at: number, extra: HpEvent[] = []) {
    const max = this.maxHp.get(from.player) as number;
    const list = this.events.get(from.player) ?? [];
    const more = extra.filter((e) => e.player === from.player && e.at < at).sort((a, b) => a.at - b.at);
    let hp = from.hp;
    let i = from.next;
    let j = 0;
    for (;;) {
      const own = i < list.length && list[i].at < at ? list[i] : null;
      const added = j < more.length ? more[j] : null;
      if (!own && !added) return hp;
      if (own && (!added || own.at <= added.at)) {
        hp = this.step(hp, own, max);
        i++;
      } else if (added) {
        hp = this.step(hp, added, max);
        j++;
      }
    }
  }

  private step(hp: number, event: HpEvent, max: number) {
    const low = event.lowHp;
    const times = low && max ? 1 + (low.times - 1) * Math.min(1, Math.max(0, (1 - hp / max) / (1 - low.fullAt))) : 1;
    return Math.min(max, Math.max(event.floor ?? 0, hp + event.amount * times));
  }
}
