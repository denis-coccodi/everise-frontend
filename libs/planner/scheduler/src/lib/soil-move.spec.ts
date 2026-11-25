import { soilFirst } from './aetherflow';
import { HpTrack } from './hp-track';
import { othersWeight } from './kind-first';
import type { Spent } from './heal-plan.model';
import type { Mechanic, PlannedUse } from './plan.model';
import { soilToMove } from './soil-move';

const SOIL = 188;
const INDOMITABILITY = 3583;
const use = (action: number, at: number, rest: Partial<PlannedUse> = {}): PlannedUse => ({
  player: 2,
  action,
  name: `A${action}`,
  at,
  target: null,
  covers: [],
  ...rest,
});
const spentOf = (u: PlannedUse): Spent => ({ ...u, group: `2:${u.action}`, pool: null, gcd: false, castMs: 0 });
const mechanics = new Map([10, 20].map((id) => [id, { id, at: id * 1000 } as Mechanic]));

describe('soilToMove', () => {
  // Soil planned at 18s for the hit at 20s; the heals would use Indomitability at 9s.
  const soil = use(SOIL, 18_000, { covers: [20] });
  const indom = { use: use(INDOMITABILITY, 9_000) };

  it("finds a Soil planned soon after an Indomitability, that still covers its hits from the Indomitability's moment", () => {
    expect(soilToMove(indom, [soil], mechanics, [spentOf(soil)])).toBe(soil);
  });

  it('leaves it where it would no longer cover a hit, its recast would not fit, or Recitation made the heal critical', () => {
    const far = use(SOIL, 18_000, { covers: [20, 30] });
    const more = new Map([...mechanics, [30, { id: 30, at: 30_000 } as Mechanic]]);
    expect(soilToMove(indom, [far], more, [spentOf(far)])).toBeNull();
    const before = use(SOIL, -10_000);
    expect(soilToMove(indom, [soil], mechanics, [spentOf(soil), spentOf(before)])).toBeNull();
    expect(soilToMove({ use: { ...indom.use, critical: true } }, [soil], mechanics, [spentOf(soil)])).toBeNull();
    expect(soilToMove({ use: use(7434, 9_000) }, [soil], mechanics, [spentOf(soil)])).toBeNull();
  });
});

describe('soilFirst', () => {
  const better = (a: { value: number }, b: { value: number }) => a.value > b.value;
  const c = (action: number, value: number, rest: Partial<PlannedUse> = {}) => ({ use: use(action, 0, rest), value });

  it("takes the scholar's Soil over their Indomitability where both would help, not over a critical one", () => {
    expect(soilFirst([c(INDOMITABILITY, 3), c(SOIL, 1)], better)?.use.action).toBe(SOIL);
    expect(soilFirst([c(INDOMITABILITY, 3, { critical: true }), c(SOIL, 1)], better)?.use.action).toBe(INDOMITABILITY);
    expect(soilFirst([c(INDOMITABILITY, 3), null], better)?.use.action).toBe(INDOMITABILITY);
  });
});

describe('othersWeight', () => {
  it("counts the other hits in Sacred Soil's window in full, a quarter for anything else", () => {
    expect(othersWeight([{ tool: { action: SOIL } }])).toBe(1);
    expect(othersWeight([{ tool: { action: 7535 } }])).toBe(0.25);
  });
});

describe('HpTrack.remove', () => {
  it('takes back heals added before', () => {
    const track = new HpTrack(new Map([[1, 100]]), [{ at: 1, player: 1, amount: -50 }]);
    const heal = [{ at: 2, player: 1, amount: 30 }];
    track.add(heal);
    expect(track.points(1).at(-1)?.hp).toBe(80);
    track.remove(heal);
    expect(track.points(1).at(-1)?.hp).toBe(50);
  });
});
