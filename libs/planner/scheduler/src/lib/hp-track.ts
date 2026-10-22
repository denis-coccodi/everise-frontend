import type { HpEvent, HpCheckpoint } from './hp-track.model';

// Each player's HP over the pull: from full at the start, down with every
// hit and up with every heal, never below 0 or above their max HP.
export class HpTrack {
  private readonly events = new Map<number, HpEvent[]>();

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
    }
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
      level = this.step(level, list[i].amount, max);
      if (level <= hp) return list[i].at;
    }
    return null;
  }

  checkpoint(player: number, at: number): HpCheckpoint | null {
    const max = this.maxHp.get(player);
    if (max === undefined) return null;
    const list = this.events.get(player) ?? [];
    let hp = max;
    let next = 0;
    for (; next < list.length && list[next].at <= at; next++) hp = this.step(hp, list[next].amount, max);
    return { player, at, hp, next };
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
        hp = this.step(hp, own.amount, max);
        i++;
      } else if (added) {
        hp = this.step(hp, added.amount, max);
        j++;
      }
    }
  }

  private step(hp: number, amount: number, max: number) {
    return Math.min(max, Math.max(0, hp + amount));
  }
}
