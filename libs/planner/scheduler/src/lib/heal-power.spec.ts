import { healPower } from './heal-power';
import { action, catalog, heal, pull } from './scheduler-fixtures';

describe('healPower', () => {
  it("measures what a potency heals from each player's own heals, leaving out the biggest", () => {
    // The scholar's Lustrates (600 potency): 60,000, 60,000, 66,000 and a
    // critical 96,000.
    const timeline = pull(
      [],
      [
        [10, 2, 189, 60_000],
        [40, 2, 189, 60_000],
        [70, 2, 189, 66_000],
        [100, 2, 189, 96_000],
      ],
    );

    expect(healPower(timeline, catalog()).get(2)).toBe(100);
  });

  it('leaves out heals a healing buff was up for', () => {
    // Lustrates of 60,000, then three of 72,000 under a +20% buff.
    const timeline = pull(
      [],
      [
        [10, 2, 189, 60_000],
        [40, 2, 189, 72_000],
        [45, 2, 189, 72_000],
        [50, 2, 189, 72_000],
      ],
    );
    timeline.auras = [{ status: 1873, source: 2, target: 2, from: 35_000, to: 55_000, stacks: null, shield: null }];
    const cat = catalog();
    cat.actions.push(
      action(16536, 'Temperance', ['SCH'], 120, [
        {
          ...heal(0),
          kind: 'healingPotency',
          target: 'self',
          status: 'Temperance',
          statusId: 1873,
          percent: 20,
          potency: null,
          durationMs: 20_000,
        },
      ]),
    );

    expect(healPower(timeline, cat).get(2)).toBe(100);
  });

  it("gives players with no heals of their own the party's", () => {
    const timeline = pull([], [[10, 2, 189, 60_000]]);

    const power = healPower(timeline, catalog());

    // The paladin and the bard take the median of the others (here the
    // scholar's, the only one).
    expect([power.get(1), power.get(3)]).toEqual([100, 100]);
  });

  it('measures nothing from ticks, pets or actions without a potency', () => {
    const timeline = pull([], [[10, 2, 9999, 60_000]]);

    expect(healPower(timeline, catalog()).size).toBe(0);
  });
});
