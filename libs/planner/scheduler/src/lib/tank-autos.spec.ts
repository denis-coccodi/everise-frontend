import { autoCooldowns, autoTimes } from './tank-autos';
import type { MitigationTool, Plan, PlannedUse } from './plan.model';
import { pull } from './scheduler-fixtures';
import { Weaving } from './weaving';

// Heart of Corundum: 15% for 8s, every 25s.
const CORUNDUM = {
  player: 1,
  action: 25758,
  name: 'Heart of Corundum',
  recastMs: 25_000,
  charges: 1,
  gcd: false,
  castMs: 0,
  group: '25758',
  pool: null,
  grantedBy: null,
  effects: [
    {
      target: 'target',
      physical: 0.15,
      magic: 0.15,
      shield: null,
      hits: 1,
      durationMs: 8_000,
      status: 'Heart of Corundum',
      stack: 'Heart of Corundum',
      invulnerable: null,
    },
  ],
} satisfies MitigationTool;
const plan = (uses: PlannedUse[] = []): Plan => ({ mechanics: [], uses, hits: [], unplaced: [], hp: [] });

// The tank (1) takes an auto every 3s from `from` to `to` (in s).
function autos(from: number, to: number) {
  const hits: [number, string, number, number][] = [];
  for (let s = from; s <= to; s += 3) hits.push([s, 'Attack', 1, 10_000]);
  return autoTimes(pull(hits));
}

describe("the tanks' short cooldowns on the autos", () => {
  it('goes on the autos whenever it is ready', () => {
    const uses = autoCooldowns(plan(), [CORUNDUM], autos(10, 70), new Weaving());

    expect(uses.map((u) => [u.at, u.target])).toEqual([
      [10_000, 1],
      [37_000, 1],
      [64_000, 1],
    ]);
  });

  it("leaves room for one a mechanic has, a later one's too", () => {
    const buster = { player: 1, action: 25758, name: 'Heart of Corundum', at: 30_000, target: 1, covers: [9] };
    const uses = autoCooldowns(plan([buster]), [CORUNDUM], autos(10, 70), new Weaving());

    expect(uses.map((u) => u.at)).toEqual([55_000]);
  });

  it('not where the tank takes fewer than two autos in its time', () => {
    expect(autoCooldowns(plan(), [CORUNDUM], autos(10, 10), new Weaving())).toEqual([]);
  });

  it('a bigger one too, where the mechanics leave room for it', () => {
    const RAMPART = { ...CORUNDUM, action: 7531, name: 'Rampart', recastMs: 90_000, group: '7531' };
    const buster = { player: 1, action: 7531, name: 'Rampart', at: 100_000, target: null, covers: [9] };
    const uses = autoCooldowns(plan([buster]), [RAMPART], autos(10, 200), new Weaving());

    expect(uses.map((u) => u.at)).toEqual([10_000, 190_000]);
  });
});
