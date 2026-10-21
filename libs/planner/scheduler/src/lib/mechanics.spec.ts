import { mechanicsOf } from './mechanics';
import { pull } from './scheduler-fixtures';

describe('mechanicsOf', () => {
  it("groups an attack's hits landing together, and says what kind each is", () => {
    const mechanics = mechanicsOf(
      pull([
        [10, 'Raidwide', 1, 50_000],
        [10.4, 'Raidwide', 2, 50_000],
        [10.8, 'Raidwide', 3, 50_000],
        [20, 'Buster', 1, 90_000],
        [30, 'Spread', 2, 30_000],
        [30, 'Spread', 3, 30_000],
      ]),
    );

    expect(mechanics.map((m) => [m.name, m.at, m.kind, m.hits.map((h) => h.player)])).toEqual([
      ['Raidwide', 10_000, 'raidwide', [1, 2, 3]],
      ['Buster', 20_000, 'tankbuster', [1]],
      ['Spread', 30_000, 'targeted', [2, 3]],
    ]);
  });

  it('keeps the same attack a second later apart', () => {
    const mechanics = mechanicsOf(
      pull([
        [10, 'Blood Lash', 1, 50_000],
        [13, 'Blood Lash', 1, 50_000],
      ]),
    );

    expect(mechanics.map((m) => m.at)).toEqual([10_000, 13_000]);
  });

  it('leaves out auto-attacks, ticks and hits that did nothing', () => {
    const timeline = pull([
      [5, 'Attack', 1, 20_000],
      [6, 'Puddle', 2, 0],
      [7, 'Bleed', 3, 5_000],
      [8, 'Raidwide', 1, 50_000],
    ]);
    timeline.damage[2].tick = true;

    expect(mechanicsOf(timeline).map((m) => m.name)).toEqual(['Raidwide']);
  });
});
