import type { PullTimeline } from '@everise/core/api-types';
import type { GroupLimitBreak } from './limit-break-gauge.model';

// Every job's Limit Break, by action (the game data's category 9, all
// classes), and its level: the bars of gauge it takes.
const LEVELS: Record<number, number> = {
  ...Object.fromEntries([197, 200, 203, 206, 4238].map((id) => [id, 1])),
  ...Object.fromEntries([198, 201, 204, 207, 4239].map((id) => [id, 2])),
  ...Object.fromEntries(
    [
      199, 202, 205, 208, 4240, 4241, 4242, 4243, 4244, 4245, 4246, 4247, 4248, 7861, 7862, 17105, 17106, 24858, 24859,
      34866, 34867,
    ].map((id) => [id, 3]),
  ),
};
// The tanks' (kept where the group used them).
const TANKS = new Set([197, 198, 199, 4240, 4241, 17105]);
// A bar of gauge, as FFLogs counts it.
const BAR = 10_000;

export const limitBreakLevel = (action: number) => LEVELS[action] ?? 0;

// The group's Limit Breaks as played, in time order.
export function groupLimitBreaks(timeline: PullTimeline): GroupLimitBreak[] {
  return timeline.playerCasts
    .filter((c) => limitBreakLevel(c.action) > 0)
    .map((c) => ({ at: c.at, action: c.action, level: limitBreakLevel(c.action), player: c.source }))
    .sort((a, b) => a.at - b.at);
}

// Whether a tank's level 3 Limit Break can be cast at `at` on the group's
// gauge, as the log has it (`gauge`): three full bars then; the group's
// next Limit Break not a tank's, whose gauge that was (it stays as
// played); and no other planned (`planned`, their casts) since the group's
// last. With the group's next Limit Break, which it takes the place of
// (null when they never spent it); undefined where it can't.
export function gaugeAt(
  at: number,
  gauge: PullTimeline['limitBreakGauge'],
  played: GroupLimitBreak[],
  planned: number[],
): { replaces: GroupLimitBreak | null } | undefined {
  const now = [...gauge].reverse().find((g) => g.at <= at);
  if (!now || now.bars < 3 || now.value < 3 * BAR) return undefined;
  const next = played.find((lb) => lb.at >= at) ?? null;
  if (next && TANKS.has(next.action)) return undefined;
  const last = [...played].reverse().find((lb) => lb.at < at)?.at ?? -Infinity;
  if (planned.some((p) => p > last && p < (next?.at ?? Infinity))) return undefined;
  return { replaces: next };
}
