import type { PullTimeline, TimelinePlayer } from '@everise/core/api-types';
import { TICK_MS, tickOf } from './mp';

// A player acting this long after a death was raised.
const RAISED_MS = 1_000;

// A player's MP past a completed wipe's wipe point (`from`), when nobody of
// their job in the kill gives it: from where it stood then (for one lying
// dead, where it stood before they died: the MP model takes the first
// reading after a death as the raise, and a plan that keeps them alive
// gives that back), back to the max at their own tick, their own rotation
// taken as spending none. The plan's
// uses spend and gain on top (a Dark Knight's Blackest Night, a healer's
// GCD heals, Lucid Dreaming); without this their MP stood still past the
// wipe point, at 0 for one who died.
export function mpPastWipePoint(wipe: PullTimeline, player: TimelinePlayer, from: number, end: number) {
  const max = player.maxMp;
  if (!max || !player.mp.length) return [];
  const died = wipe.deaths.filter((d) => d.player === player.id && d.at <= from).at(-1);
  const raised =
    died && wipe.playerCasts.some((c) => c.source === player.id && c.at > died.at + RAISED_MS && c.at <= from);
  const tick = tickOf(player.mp);
  const down = died && !raised;
  let mp = [...player.mp].reverse().find((r) => r.at <= from && (!down || r.mp > 0))?.mp ?? max;
  const readings = [{ at: from + 1, mp }];
  for (let at = from + TICK_MS; mp < max && at <= end; at += TICK_MS) {
    mp = Math.min(max, mp + tick);
    readings.push({ at, mp });
  }
  return readings;
}
