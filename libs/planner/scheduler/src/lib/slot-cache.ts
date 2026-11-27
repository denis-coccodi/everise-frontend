import { firstPressAt, ogcdWithFirstBefore } from './first-press';
import type { MitigationTool } from './plan.model';
import type { Occupied } from './weaving.model';
import type { Weaving } from './weaving';

// Where a player can use a tool for a hit, and its first press's slot (Tempera Grassa's Tempera Coat: `first-press.ts`),
// remembered for one mitigation pass: its fill asks again for every tool after each pick, though the player's own uses,
// which alone change the answers there, mostly haven't (nothing changes the weaving during a pass). On a Dancing Mad
// kill the weaving's checks were about half the planning time, a third of it looking back slot by slot for a first
// press. The answers are `Weaving.gcdBefore`'s, `ogcdWithFirstBefore`'s and `firstPressAt`'s.
export function slotCache(weaving: Weaving) {
  const known = new Map<string, number | null | undefined>();
  const remembered = <T extends number | null | undefined>(key: string, find: () => T): T => {
    if (!known.has(key)) known.set(key, find());
    return known.get(key) as T;
  };
  const own = (occupied: Occupied[]) =>
    occupied
      .map((o) => `${o.at}${o.gcd ? 'g' + o.castMs : ''}${o.firstAt === undefined ? '' : 'f' + o.firstAt}`)
      .join(',');
  const first = (t: MitigationTool, at: number, occupied: Occupied[], mine: string) =>
    remembered(`f|${t.player}|${t.action}|${at}|${mine}`, () =>
      firstPressAt(weaving, t.player, t.action, at, occupied),
    );
  return {
    // The latest moment from `from` to `at` the player can use `t`, with a slot for its first press where it needs one.
    slot(t: MitigationTool, at: number, from: number, occupied: Occupied[]) {
      const mine = own(occupied);
      if (t.gcd)
        return remembered(`g|${t.player}|${t.castMs}|${at}|${from}|${mine}`, () =>
          weaving.gcdBefore(t.player, at - t.castMs, from, t.castMs, occupied),
        );
      const slot = (latest: number) =>
        remembered(`o|${t.player}|${latest}|${from}|${mine}`, () =>
          weaving.ogcdBefore(t.player, latest, from, occupied),
        );
      return ogcdWithFirstBefore(weaving, t.player, t.action, at, from, occupied, slot, (found) =>
        first(t, found, occupied, mine),
      );
    },
    // Where a use of `t` at `at` has its first press, to spread into it (`PlannedUse.firstAt`).
    first(t: MitigationTool, at: number, occupied: Occupied[]) {
      const firstAt = first(t, at, occupied, own(occupied));
      return typeof firstAt === 'number' ? { firstAt } : {};
    },
  };
}
