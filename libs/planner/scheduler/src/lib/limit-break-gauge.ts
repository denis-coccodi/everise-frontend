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
// The healers' (Healing Wind, Breath of the Earth, Pulse of Life): not kept where a replanned healer used one.
export const HEALER_LIMIT_BREAKS = new Set([206, 207, 208]);
export const PULSE_OF_LIFE = 208;
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

// The group's gauge and Limit Breaks as the plan has them: a healer Limit Break a replanned healer (`replanned`) used is
// not kept (it put the party back up after something went wrong, which the plan is there to prevent), its bars back in
// the gauge from then until the group's next Limit Break, for a last-resort one there.
export function withHealerBarsBack(timeline: PullTimeline, replanned: (player: number) => boolean) {
  const all = groupLimitBreaks(timeline);
  const dropped = all.filter((lb) => HEALER_LIMIT_BREAKS.has(lb.action) && replanned(lb.player));
  const played = all.filter((lb) => !dropped.includes(lb));
  const gauge = timeline.limitBreakGauge.map((g) => {
    const back = dropped
      .filter((lb) => lb.at <= g.at && !played.some((o) => o.at > lb.at && o.at <= g.at))
      .reduce((sum, lb) => sum + lb.level * BAR, 0);
    return back ? { ...g, value: Math.min(g.bars * BAR, g.value + back) } : g;
  });
  return { gauge, played };
}
