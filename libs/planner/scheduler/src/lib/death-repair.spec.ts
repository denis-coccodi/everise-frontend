import { heldFor, repairDeaths, withHolds } from './death-repair';
import type { Hold } from './death-repair.model';
import type { Plan, PlannedUse } from './plan.model';

describe('repairDeaths', () => {
  // A healer (1) whose Temperance (120s) went on a raidwide at 100s, and a
  // death at 180s it could have saved; a tank (2) not replanned.
  const use = (changes: Partial<PlannedUse>): PlannedUse => ({
    player: 1,
    action: 16536,
    name: 'Temperance',
    at: 100_000,
    target: null,
    covers: [],
    ...changes,
  });
  const recasts = new Map([
    [16536, 120_000],
    [7432, 30_000],
  ]);
  const recastOf = (action: number) => recasts.get(action) ?? 0;
  const death = { player: 3, at: 180_000, mechanic: 9, raisedBy: null, raisedAt: null, backAt: null };
  const plan = (uses: PlannedUse[], deaths = [death]) =>
    ({ uses, deaths, replanned: [1], hits: [] }) as unknown as Plan;

  it('holds a big cooldown spent before a death, still recasting when it lands, until the death', () => {
    expect(heldFor(plan([use({})]), recastOf)).toEqual([{ player: 1, action: 16536, from: 60_000, to: 165_000 }]);
  });

  it("leaves short cooldowns, uses that cover the death's hit, and others' or played uses", () => {
    const uses = [
      use({ action: 7432, name: 'Divine Benison' }),
      use({ at: 170_000 }),
      use({ at: 50_000 }),
      use({ player: 2 }),
      use({ played: true }),
      use({ opener: true }),
      use({ raise: true }),
    ];
    expect(heldFor(plan(uses), recastOf)).toEqual([]);
  });

  it('keeps a replan with fewer deaths, and tries no more once none is left', () => {
    const asked: Hold[][] = [];
    const replanWith = (holds: Hold[]) => {
      asked.push(holds);
      return plan([use({ at: 170_000 })], []);
    };

    const repaired = repairDeaths(plan([use({})]), replanWith, recastOf, () => true);

    expect(repaired.deaths).toEqual([]);
    expect(asked).toEqual([[{ player: 1, action: 16536, from: 60_000, to: 165_000 }]]);
  });

  it("keeps the plan when moving the cooldown doesn't save anyone", () => {
    const first = plan([use({})]);
    let tries = 0;
    const replanWith = () => {
      tries++;
      return plan([use({ at: 170_000 })]);
    };

    expect(repairDeaths(first, replanWith, recastOf, () => true)).toBe(first);
    expect(tries).toBe(1);
  });

  it('keeps the held cooldown out of its window', () => {
    const tool = { player: 1, action: 16536, away: [{ from: 0, to: 1_000 }] };
    const hold = { player: 1, action: 16536, from: 60_000, to: 165_000 };

    expect(withHolds([tool, { player: 2, action: 16536 }], [hold])).toEqual([
      { ...tool, away: [...tool.away, { from: 60_000, to: 165_000 }] },
      { player: 2, action: 16536 },
    ]);
  });
});
