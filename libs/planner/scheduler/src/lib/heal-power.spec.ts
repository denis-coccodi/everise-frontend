import { healPower } from './heal-power';
import { catalog, pull } from './scheduler-fixtures';

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
