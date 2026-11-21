import type { PullTimeline } from '@everise/core/api-types';

type Span = { from: number; to: number };

// A solo phase lasts this long at least: Necron's lasts about 50s.
const MIN_MS = 20_000;
// It lies inside a downtime, give or take this much: the last heal on the party goes up as the boss leaves.
const DOWN_SLACK_MS = 5_000;
// In it, the players still take this many enemy hits, and the healers heal themselves this many times.
const MIN_HITS = 5;
const MIN_SELF_HEALS = 2;

// When each player is alone in their own instance (Necron's solo phase: each fights an add of their own while the
// boss is gone), from the log alone: no fight script needed, so a new fight has it from the first day. A stretch of
// 20s or more, the boss untargetable, in which nobody's heal or buff (not their ticks) reaches anyone but themselves,
// yet players take enemy hits and the healers heal themselves. It starts at the last heal or buff on someone else and
// ends at the next one, when they're together again. FFLogs logs the damage of only some instances, so it counts
// hits, not who took them. On the bench (88 kills) it finds both Necron EX kills' and nothing else: other long
// stretches with nothing on others (cutscenes, transitions) have at most one self-heal.
export function soloPhases(timeline: PullTimeline): Span[] {
  const party = new Set(timeline.players.map((p) => p.id));
  const healers = new Set(timeline.players.filter((p) => p.role === 'healer').map((p) => p.id));
  const between = (a: number | null, b: number | null) => a !== null && b !== null && party.has(a) && party.has(b);
  const others = [
    ...timeline.heals.filter((h) => !h.tick && between(h.source, h.target) && h.source !== h.target).map((h) => h.at),
    ...timeline.auras.filter((a) => between(a.source, a.target) && a.source !== a.target).map((a) => a.from),
  ].sort((a, b) => a - b);
  const phases: Span[] = [];
  for (let i = 1; i < others.length; i++) {
    const [from, to] = [others[i - 1], others[i]];
    if (to - from < MIN_MS) continue;
    if (!timeline.downtime.some((d) => d.from <= from + DOWN_SLACK_MS && d.to >= to - DOWN_SLACK_MS)) continue;
    const inside = (at: number) => at > from && at < to;
    const hits = timeline.damage.filter(
      (d) => inside(d.at) && party.has(d.target) && !party.has(d.source ?? -1) && d.amount > 0,
    ).length;
    const selfHeals = timeline.heals.filter(
      (h) => inside(h.at) && !h.tick && h.source !== null && healers.has(h.source) && h.target === h.source,
    ).length;
    if (hits >= MIN_HITS && selfHeals >= MIN_SELF_HEALS) phases.push({ from, to });
  }
  return phases;
}

// Whether a use made at `at` can reach `player`: always its own user; anyone else but in a solo phase.
export const reachable = (alone: Span[] | undefined, user: number, at: number, player: number) =>
  player === user || !alone?.some((s) => s.from <= at && at < s.to);

// The tools with the pull's solo phases (`alone`): used in one, they reach only their user.
export function withSoloPhases<T extends { alone?: Span[] }>(timeline: PullTimeline, tools: T[]): T[] {
  const alone = soloPhases(timeline);
  return alone.length ? tools.map((t) => ({ ...t, alone })) : tools;
}
