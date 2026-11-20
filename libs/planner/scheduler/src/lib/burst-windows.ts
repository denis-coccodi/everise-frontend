import type { PullTimeline } from '@everise/core/api-types';

// The party raid buffs that mark a burst window as played: Divination, Chain
// Stratagem, Brotherhood, Battle Litany, Embolden, Technical Finish (and its
// quadruple), Searing Light, Arcane Circle, Dokumori, Mug, Battle Voice,
// Radiant Finale, Starry Muse.
const RAID_BUFFS = new Set([
  16552, 7436, 7396, 3557, 7520, 16004, 16196, 33218, 25801, 24405, 36957, 2248, 118, 25785, 34675,
]);
// Raid buffs this close to the first of a window are in it.
const WINDOW_MS = 15_000;
// A buff with a shorter recast than this waits for a window no longer than
// half its recast; a two-minute one, for the next window however late.
const TWO_MINUTES = 120_000;

// The party's burst windows as played, by when each began: the raid buffs of
// at least two players (of one, where only one in the party has any) within
// `WINDOW_MS`. In 88 kills' logs, 64% of windows came 120±3s after the one
// before; the rest later, for downtime and hard mechanics (150s, 171s, 225s).
export function burstWindows(timeline: PullTimeline): number[] {
  const casts = timeline.playerCasts.filter((c) => RAID_BUFFS.has(c.action)).sort((a, b) => a.at - b.at);
  const need = Math.min(2, new Set(casts.map((c) => c.source)).size);
  const windows: { from: number; players: Set<number> }[] = [];
  for (const c of casts) {
    const last = windows.at(-1);
    if (last && c.at - last.from <= WINDOW_MS) last.players.add(c.source);
    else windows.push({ from: c.at, players: new Set([c.source]) });
  }
  return windows.filter((w) => need && w.players.size >= need).map((w) => w.from);
}

// When a buff back at `back` (its recast `everyMs`) goes: in the window it's
// back during (as soon as it is), or else the next, where it's a two-minute
// buff or that window comes within half its recast; else on cooldown, at
// `back`. With no windows, at `back`.
export function windowDue(back: number, everyMs: number, windows: number[]): number {
  const next = windows.find((w) => w + WINDOW_MS >= back);
  if (next === undefined) return back;
  return everyMs >= TWO_MINUTES || next - back <= everyMs / 2 ? Math.max(next, back) : back;
}
