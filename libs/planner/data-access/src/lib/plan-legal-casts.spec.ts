import type { Plan, PlannedUse } from '@everise/planner/scheduler';
import { withLegalCasts } from './plan-legal-casts';
import { planLegality } from './plan-legality';
import { actionCatalog, pullTimeline } from './planner-fixtures';

const use = (at: number, extra: Partial<PlannedUse> = {}): PlannedUse => ({
  player: 1,
  action: 7531,
  name: 'Rampart',
  at,
  target: null,
  covers: [],
  ...extra,
});
const planOf = (uses: PlannedUse[]): Plan => ({ mechanics: [], uses, hits: [], unplaced: [], hp: [] });

describe('withLegalCasts', () => {
  it('moves a cast the plan placed for no hit to the first time it is back', () => {
    // Rampart: 60s, one charge; on time a second before.
    const fixed = withLegalCasts(planOf([use(100_000), use(130_000)]), pullTimeline(), actionCatalog());
    expect(fixed.uses.map((u) => u.at)).toEqual([100_000, 159_000]);
    expect(planLegality(fixed, pullTimeline(), actionCatalog()).plan).toEqual([]);
  });

  it('leaves where they are the casts that cover a hit and those the user placed', () => {
    const plan = planOf([use(100_000), use(130_000, { covers: [1] }), use(140_000, { edited: true })]);
    expect(withLegalCasts(plan, pullTimeline(), actionCatalog()).uses).toEqual(plan.uses);
  });

  it('withholds a cast kept as played that the plan leaves them unable to press', () => {
    // Their attack at 62s, kept as played (the fixture's, on a 60s recast; the plan's 22s before): not back by then.
    const blade = use(40_000, { action: 9, name: 'Fast Blade' });
    const fixed = withLegalCasts(planOf([blade]), pullTimeline(), actionCatalog());
    expect(fixed.withheld).toEqual([{ player: 1, action: 9, at: 62_000 }]);
    expect(fixed.uses).toEqual([blade]);
    expect(planLegality(fixed, pullTimeline(), actionCatalog()).plan).toEqual([]);
  });
});
