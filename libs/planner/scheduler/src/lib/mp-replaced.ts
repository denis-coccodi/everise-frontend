import type { ActionCatalog, PullTimeline } from '@everise/core/api-types';

// A planned GCD this close to one of theirs took its slot.
const SAME_SLOT_MS = 600;

// What a replanned player's damage spell as played cost (an MP cost, no heal
// or shield, not an action the plan places: `scheduled`) where a GCD of the
// plan's at `at` takes its slot, so that spell is gone and its MP with it
// (Fall Malefic's 400 under a planned Helios); 0 where none was.
export function replacedSpells(
  timeline: PullTimeline,
  catalog: ActionCatalog,
  players: Set<number>,
  scheduled: Set<string>,
): (player: number, at: number) => number {
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const spells = timeline.playerCasts.filter((c) => {
    const a = byId.get(c.action);
    const healing = a?.effects.some((e) => e.kind === 'heal' || e.kind === 'shield');
    return players.has(c.source) && !!a?.gcd && a.mpCost > 0 && !healing && !scheduled.has(`${c.source}:${c.action}`);
  });
  return (player, at) => {
    const spell = spells.find((c) => c.source === player && Math.abs(c.at - at) < SAME_SLOT_MS);
    return spell ? (byId.get(spell.action)?.mpCost ?? 0) : 0;
  };
}
