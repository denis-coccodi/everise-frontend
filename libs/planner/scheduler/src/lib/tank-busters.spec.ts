import type { Candidate } from './mitigation-plan.model';
import type { Mechanic, MechanicHit, MitigationTool, PlannedUse } from './plan.model';
import { shortAndLong } from './tank-busters';

const TANK = 1;
// The tank's tools: Heart of Corundum (short), Great Nebula and Rampart (long), Camouflage.
const tool = (action: number, value: number) =>
  ({ player: TANK, action, name: String(action), value }) as unknown as MitigationTool & { value: number };
const tools = [tool(25758, 15), tool(36935, 40), tool(7531, 20), tool(16140, 10)];
const buster = (unmitigated: number, id = 1): Mechanic =>
  ({ id, at: 60_000, kind: 'tankbuster', hits: [{ player: TANK, unmitigated, avoidable: false }] }) as Mechanic;
const maxHp = new Map([[TANK, 100_000]]);

function plan(
  mechanics: Mechanic[],
  { killing = false, saved = false, up = [] as number[], unavailable = [] as number[] } = {},
) {
  const uses: PlannedUse[] = [];
  const best = (m: Mechanic, t: MitigationTool): Candidate | null =>
    unavailable.includes(t.action)
      ? null
      : ({
          use: { player: t.player, action: t.action, name: t.name, at: m.at - 500, target: null, covers: [] },
          tool: t,
          value: (t as MitigationTool & { value: number }).value,
        } as Candidate);
  shortAndLong(mechanics, tools, maxHp, uses, {
    covered: (_m: Mechanic, _h: MechanicHit, actions: Set<number>) => up.some((a) => actions.has(a)),
    best,
    add: (c) => uses.push(c.use),
    killing: () => () => killing,
    saved: () => saved,
  });
  return uses.map((u) => u.action);
}

describe('shortAndLong', () => {
  it("gives a heavy buster the tank's short cooldown and the long one that does the most", () => {
    expect(plan([buster(70_000)])).toEqual([25758, 36935]);
  });

  it('leaves a buster under 60% of max HP to the rest of the plan', () => {
    expect(plan([buster(50_000)])).toEqual([]);
  });

  it("adds none of a kind already up on the tank, the other tank's Intervention counting as a short one", () => {
    expect(plan([buster(70_000)], { up: [7382] })).toEqual([36935]);
    expect(plan([buster(70_000)], { up: [7531] })).toEqual([25758]);
  });

  it("brings a gunbreaker's Camouflage with Rampart", () => {
    expect(plan([buster(70_000)], { unavailable: [36935] })).toEqual([25758, 7531, 16140]);
  });

  it('takes them back from a hit they leave killing only where an invulnerability fits for it', () => {
    expect(plan([buster(300_000)], { killing: true, saved: true })).toEqual([]);
    expect(plan([buster(300_000)], { killing: true, saved: false })).toEqual([25758, 36935]);
  });

  it('plans nothing for other kinds of mechanics', () => {
    expect(plan([{ ...buster(70_000), kind: 'raidwide' }])).toEqual([]);
  });
});
