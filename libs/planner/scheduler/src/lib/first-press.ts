import type { Occupied } from './weaving.model';
import { WEAVE_MS, type Weaving } from './weaving';

// Where the first press of an oGCD that needs one goes (`pressedFirst` in tools.ts), in a weave slot of its own, as the
// logs' players press it (93 Tempera Grassas, 73 Improvised Finishes on the bench): Tempera Coat in Grassa's gap or
// the one before (43 in the same gap, 45 one GCD before; 90% within 4s); Improvisation always in its finish's gap,
// mostly just before (a median 0.9s: the two fill a 2.5s gap).
const FIRST: Record<number, { withinMs: number; sameGap: boolean }> = {
  34686: { withinMs: 4_000, sameGap: false },
  25789: { withinMs: 1_500, sameGap: true },
};

// The latest free weave slot for `action`'s first press before its use at `at`; null when there's none, undefined
// when it needs none.
export function firstPressAt(
  weaving: Weaving,
  player: number,
  action: number,
  at: number,
  occupied: Occupied[],
): number | null | undefined {
  const first = FIRST[action];
  if (!first) return undefined;
  const withIt = [...occupied, { at, gcd: false, castMs: 0 }];
  const found = weaving.ogcdBefore(player, at - WEAVE_MS, at - first.withinMs, withIt);
  if (found === null) return null;
  const gcdBetween =
    weaving.gcdsBetween(player, found + 1, at - 1).length > 0 ||
    occupied.some((o) => o.gcd && o.at > found && o.at < at);
  return first.sameGap && gcdBetween ? null : found;
}

// The latest moment from `from` to `at` the player can use oGCD `action`, with a slot for its first press where it
// needs one (`Weaving.ogcdBefore`). `slot` and `first` answer as those do (`slot-cache.ts` remembers them).
export function ogcdWithFirstBefore(
  weaving: Weaving,
  player: number,
  action: number,
  at: number,
  from: number,
  occupied: Occupied[],
  slot = (latest: number) => weaving.ogcdBefore(player, latest, from, occupied),
  first = (found: number) => firstPressAt(weaving, player, action, found, occupied),
): number | null {
  for (let latest = at; latest >= from;) {
    const found = slot(latest);
    if (found === null || first(found) !== null) return found;
    latest = found - 1;
  }
  return null;
}

// Where the first press of a use of `action` at `at` goes, to spread into it (`PlannedUse.firstAt`).
export function withFirst(weaving: Weaving, player: number, action: number, at: number, occupied: Occupied[]) {
  const firstAt = firstPressAt(weaving, player, action, at, occupied);
  return typeof firstAt === 'number' ? { firstAt } : {};
}
