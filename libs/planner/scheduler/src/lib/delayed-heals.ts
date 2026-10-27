import { healEvents } from './hp-events';
import { HpTrack } from './hp-track';
import { HealTool, PlannedUse, ShieldSize } from './plan.model';
import type { HpEvent } from './hp-track.model';

// The HP a use of a heal tool restores, and when, as the pull goes on:
// - a triggered heal (Excogitation) when its target first drops to its
//   share of max HP, or when it ends;
// - a heal by stacks (Haima, Panhaima, Liturgy of the Bell): each hit on
//   whoever holds them uses one up (Liturgy healing the party then), and the
//   rest heal when it ends;
// - Macrocosmos when it ends or is set off (`delayMs`), with its share of
//   the damage each took meanwhile on top;
// any other `delayMs` after it lands (Earthly Star, Exaltation; 0 for a
// heal that lands as it's cast). `hitTimes` says when the mechanics hit a
// player after one moment, up to another (inclusive).
export function delayedEvents(
  tool: HealTool,
  use: PlannedUse,
  delayMs: number,
  party: number[],
  maxHp: Map<number, number>,
  track: HpTrack,
  hitTimes: (player: number, from: number, to: number) => number[],
): HpEvent[] {
  const delayed = tool.delayed;
  const plain = () => healEvents(tool, use, party, maxHp, delayMs);
  if (!delayed) return plain();
  const from = use.at + tool.castMs;
  const end = delayed.delaysMs[0];
  const to = from + end;
  const atEnd = () => healEvents(tool, use, party, maxHp, end);

  if (delayed.belowShare !== null) {
    const player = use.target ?? use.player;
    const low = track.firstAtOrBelow(player, from, to, delayed.belowShare * (maxHp.get(player) ?? 0));
    return healEvents(tool, use, party, maxHp, low === null ? end : low - from);
  }
  if (delayed.stacks) {
    const { count, holder, perHit } = delayed.stacks;
    const holderOf = (player: number) =>
      holder === 'self' ? use.player : holder === 'target' ? (use.target ?? use.player) : player;
    const used = (player: number) => hitTimes(holderOf(player), from, to).slice(0, count);
    const events = atEnd()
      .map((e) => ({ ...e, amount: e.amount * (count - used(e.player).length) }))
      .filter((e) => e.amount > 0);
    if (perHit) {
      for (const at of used(use.player)) {
        for (const player of party) events.push({ at, player, amount: sizeOf(perHit, player, maxHp) });
      }
    }
    return events;
  }
  if (delayed.damageShare !== null) {
    // At its end, or sooner when set off (Microcosmos), with what it has
    // gathered by then.
    const share = delayed.damageShare;
    return healEvents(tool, use, party, maxHp, delayMs).map((e) => ({
      ...e,
      amount: e.amount + share * track.damageBetween(e.player, from, from + delayMs),
    }));
  }
  return plain();
}

function sizeOf(size: ShieldSize, player: number, maxHp: Map<number, number>) {
  return 'hp' in size ? size.hp : size.maxHpShare * (maxHp.get(player) ?? 0);
}
