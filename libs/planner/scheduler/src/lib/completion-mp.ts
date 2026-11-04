import type { ActionCatalog, PullTimeline, TimelinePlayer } from '@everise/core/api-types';
import { TICK_MS, tickOf } from './mp';

// A player acting this long after a death was raised.
const RAISED_MS = 1_000;
// A GCD's length when the log has too few to tell, and the range a
// measured one is kept in.
const GCD_MS = 2_500;
const MIN_GCD_MS = 1_500;
const MAX_GCD_MS = 3_500;
// A tooltip that starts like this is an attack's.
const ATTACK = /^(Deals|Delivers)\b/;

// A player's MP past a completed wipe's wipe point (`from`), when nobody of
// their job in the kill gives it: from where it stood then (for one lying
// dead, where it stood before they died: the MP model takes the first
// reading after a death as the raise, and a plan that keeps them alive
// gives that back), back at their own tick, less what their damage spells
// cost at their own pace (a healer's 400 MP Fall Malefic or Glare III each
// GCD), as their log before the wipe point has them. The plan's uses spend
// and gain on top (a Dark Knight's Blackest Night, a healer's GCD heals,
// Lucid Dreaming). Without the damage spells their MP climbed to full past
// the wipe point and stayed there.
export function mpPastWipePoint(
  wipe: PullTimeline,
  player: TimelinePlayer,
  from: number,
  end: number,
  catalog: ActionCatalog,
) {
  const max = player.maxMp;
  if (!max || !player.mp.length) return [];
  const died = wipe.deaths.filter((d) => d.player === player.id && d.at <= from).at(-1);
  const raised =
    died && wipe.playerCasts.some((c) => c.source === player.id && c.at > died.at + RAISED_MS && c.at <= from);
  const tick = tickOf(player.mp);
  const down = died && !raised;
  const { perGcd, gcdMs } = damageSpending(wipe, player.id, from, catalog);
  let mp = [...player.mp].reverse().find((r) => r.at <= from && (!down || r.mp > 0))?.mp ?? max;
  const readings = [{ at: from + 1, mp }];
  // Their GCDs only matter when their damage spells cost them MP.
  let [nextTick, nextGcd] = [from + TICK_MS, perGcd > 0 ? from + gcdMs : Infinity];
  while (Math.min(nextTick, nextGcd) <= end && (perGcd > 0 || mp < max)) {
    const at = Math.min(nextTick, nextGcd);
    if (at === nextTick) {
      mp += tick;
      nextTick += TICK_MS;
    } else {
      mp -= perGcd;
      nextGcd += gcdMs;
    }
    // Not floored at 0: below it is MP their spells would lack without the
    // plan's Lucid Dreaming, which the MP model adds on top (and floors).
    mp = Math.min(max, mp);
    readings.push({ at, mp });
  }
  return readings;
}

// What a player's damage spells cost them a GCD, on average, and how long
// their GCD is, from their casts up to `until`.
function damageSpending(wipe: PullTimeline, player: number, until: number, catalog: ActionCatalog) {
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const gcds = wipe.playerCasts
    .filter((c) => c.source === player && c.at <= until && byId.get(c.action)?.gcd)
    .sort((a, b) => a.at - b.at);
  const damage = (id: number) => {
    const a = byId.get(id);
    return !!a && a.mpCost > 0 && !a.effects.some((e) => e.kind !== 'mp') && ATTACK.test(a.description ?? '');
  };
  const spent = gcds.reduce((sum, c) => sum + (damage(c.action) ? (byId.get(c.action)?.mpCost ?? 0) : 0), 0);
  const gaps = gcds
    .slice(1)
    .map((c, i) => c.at - gcds[i].at)
    .filter((g) => g >= MIN_GCD_MS && g <= MAX_GCD_MS);
  const sorted = gaps.sort((a, b) => a - b);
  return { perGcd: gcds.length ? spent / gcds.length : 0, gcdMs: sorted[sorted.length >> 1] ?? GCD_MS };
}
