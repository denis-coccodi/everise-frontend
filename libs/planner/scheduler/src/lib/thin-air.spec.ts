import { action, catalog, pull } from './scheduler-fixtures';
import { thinAirTimes } from './thin-air';
import { Weaving } from './weaving';

const RAISE = 125;
const CURE_III = 131;
const MEDICA = 124;

describe("a replanned white mage's Thin Air", () => {
  // The scholar (2) stands in for the white mage.
  function setup() {
    const c = catalog();
    c.actions.push(
      action(RAISE, 'Raise', ['WHM'], 2.5, [], { gcd: true, castMs: 8_000, mpCost: 2_400 }),
      action(CURE_III, 'Cure III', ['WHM'], 2.5, [], { gcd: true, castMs: 2_000, mpCost: 1_500 }),
      action(MEDICA, 'Medica', ['WHM'], 2.5, [], { gcd: true, castMs: 2_000, mpCost: 900 }),
    );
    const byId = new Map(c.actions.map((a) => [a.id, a]));
    const timeline = pull([]);
    // A raise as played at 100s.
    timeline.playerCasts = [{ at: 100_000, source: 2, target: 1, action: RAISE, castMs: 8_000 }];
    const use = (at: number, a: number) => ({ player: 2, action: a, name: '', at, target: null, covers: [] });
    return { byId, timeline, use };
  }

  it('keeps a charge for each raise as played, and spends the other on the costliest spell', () => {
    const { byId, timeline, use } = setup();
    const uses = [use(30_000, MEDICA), use(40_000, CURE_III)];

    // Before the raise, and before Cure III (1,500) rather than Medica (900,
    // not worth a charge).
    const times = thinAirTimes(2, timeline, uses, new Weaving(), byId);
    expect(times).toHaveLength(2);
    expect(times[0]).toBeLessThan(40_000);
    expect(times[0]).toBeGreaterThan(30_000);
    expect(times[1]).toBeLessThan(100_000);
    expect(times[1]).toBeGreaterThan(97_000);
  });

  it('puts none where another spell would take it first', () => {
    const { byId, timeline, use } = setup();
    timeline.playerCasts = [];
    // A Medica right before the Cure III: no room for the charge between.
    const uses = [use(39_500, MEDICA), use(40_000, CURE_III)];

    expect(thinAirTimes(2, timeline, uses, new Weaving(), byId)).toEqual([]);
  });
});
