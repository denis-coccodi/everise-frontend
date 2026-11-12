import { mechanicsOf } from './mechanics';
import { burstsOf } from './mitigation-moments';
import { planMitigation } from './mitigation-plan';
import { catalog, pull } from './scheduler-fixtures';
import { mitigationTools } from './tools';
import type { Plan, PlannedHit } from './plan.model';

describe('planMitigation', () => {
  // Three hits of 40,000 1.1s apart on everyone (100,000 HP): each
  // leaves the 10% margin at full HP, the three together don't.
  const burst = pull(
    [30, 31.1, 32.2].flatMap((at) =>
      [1, 2, 3].map((player): [number, string, number, number] => [at, 'Rain', player, 40_000]),
    ),
  );

  it('takes mechanics less than 2s apart, one after another, as a burst', () => {
    const mechanics = mechanicsOf(
      pull([
        ...burst.damage.map((h): [number, string, number, number] => [h.at / 1000, 'Rain', h.target, 40_000]),
        [40, 'Wall', 1, 10_000],
      ]),
    );

    expect([...burstsOf(mechanics).values()]).toEqual([0, 0, 0, 3]);
  });

  it("judges a burst's hits by the HP the ones before leave, and mitigates them", () => {
    const timeline = burst;
    const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp as number]));
    const tools = mitigationTools(timeline.players, catalog());

    const plan = planMitigation(mechanicsOf(timeline), tools, maxHp, { margin: 0.1 });
    const last = plan.hits.filter((h) => h.mechanic === 2);

    // Without mitigation the third leaves 0 HP; with it, each within the
    // margin of what the first two left.
    expect(plan.uses.length).toBeGreaterThan(0);
    expect(last.every((h) => h.safe)).toBe(true);
  });

  it("keeps a tank's own cooldowns for their biggest hit by its size, not by the HP a round left", () => {
    // A raidwide at 40s (70,000 on the paladin, 1), then their tank buster
    // at 60s (105,000). An earlier round had them go into the raidwide at
    // 50,000 HP, so it looked the bigger of the two.
    const timeline = pull([
      [40, 'Raidwide', 1, 70_000],
      [40, 'Raidwide', 2, 95_000],
      [40, 'Raidwide', 3, 95_000],
      [60, 'Buster', 1, 105_000],
    ]);
    const mechanics = mechanicsOf(timeline);
    const [raidwide, buster] = mechanics;
    const hit = (mechanic: number, player: number, hpBefore: number) => ({ mechanic, player, hpBefore }) as PlannedHit;
    const from: Plan = {
      mechanics,
      uses: [],
      hits: [hit(raidwide.id, 1, 50_000), hit(buster.id, 1, 100_000)],
      unplaced: [],
      hp: [],
    };
    const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp as number]));
    const tools = mitigationTools(timeline.players, catalog());

    const plan = planMitigation(mechanics, tools, maxHp, { margin: 0.1 }, from);
    const guardian = plan.uses.find((u) => u.name === 'Guardian');

    expect(guardian?.covers).toContain(buster.id);
  });
});
