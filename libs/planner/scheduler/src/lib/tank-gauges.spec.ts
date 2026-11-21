import { action, catalog } from './scheduler-fixtures';
import { allPaid, gaugeAtPull, unpaidSpends } from './tank-gauges';
import type { GaugeCast } from './tank-gauges.model';

// A warrior's and a gunbreaker's actions, with their tooltips' gauge lines.
const cat = () => {
  const c = catalog();
  const gcd = (id: number, name: string, job: string, description: string) =>
    action(id, name, [job], 2.5, [], { gcd: true, description });
  c.actions.push(
    gcd(31, 'Heavy Swing', 'WAR', 'Delivers an attack with a potency of 220.'),
    gcd(37, 'Maim', 'WAR', 'Combo Action: Heavy Swing\nCombo Bonus: Increases Beast Gauge by 10'),
    gcd(42, "Storm's Path", 'WAR', 'Combo Action: Maim\nCombo Bonus: Increases Beast Gauge by 20'),
    gcd(3549, 'Fell Cleave', 'WAR', 'Delivers an attack with a potency of 580.\nBeast Gauge Cost: 50'),
    gcd(16465, 'Inner Chaos', 'WAR', 'Beast Gauge Cost: 50'),
    action(52, 'Infuriate', ['WAR'], 60, [], { description: 'Increases Beast Gauge by 50.' }),
    action(7389, 'Inner Release', ['WAR'], 60, [], { description: 'Grants 3 stacks of Inner Release.' }),
    action(16164, 'Bloodfest', ['GNB'], 120, [], { description: 'adding 3 Cartridges to your Powder Gauge' }),
    gcd(25760, 'Double Down', 'GNB', 'Cartridge Cost: 2'),
  );
  return c;
};
const cast = (action: number, at: number, own = false): GaugeCast => ({ action, at, own });
const unpaidAt = (job: string, casts: GaugeCast[], start = 0) =>
  [...unpaidSpends(job, casts, cat(), start)].map((c) => c.at);

describe('unpaidSpends', () => {
  it('pays a Fell Cleave from a combo and Infuriate, not one with nothing left', () => {
    // Heavy Swing, Maim (10), Storm's Path (20), Infuriate (50): 80, one Fell Cleave.
    const casts = [
      cast(31, 1_000),
      cast(37, 3_500),
      cast(42, 6_000),
      cast(52, 6_500),
      cast(3549, 8_500),
      cast(3549, 11_000),
    ];
    expect(unpaidAt('WAR', casts)).toEqual([11_000]);
  });

  it('gives no combo bonus out of combo', () => {
    // Storm's Path with no Maim before it: none.
    expect(unpaidAt('WAR', [cast(31, 1_000), cast(42, 3_500), cast(3549, 6_000)], 40)).toEqual([6_000]);
  });

  it("gives the plan's own spend the gauge first", () => {
    // Infuriate's 50 goes to the plan's Inner Chaos at 10s, not their Fell Cleave at 5s.
    const casts = [cast(52, 1_000, true), cast(3549, 5_000), cast(16465, 10_000, true)];
    expect(unpaidAt('WAR', casts)).toEqual([5_000]);
  });

  it("makes the next three Fell Cleaves in Inner Release's 30s free", () => {
    const casts = [cast(7389, 1_000), ...[3_000, 5_500, 25_000, 28_000].map((at) => cast(3549, at))];
    expect(unpaidAt('WAR', casts)).toEqual([28_000]);
  });

  it("pays a gunbreaker's Double Down from Bloodfest's three Cartridges", () => {
    const casts = [cast(16164, 1_000), cast(25760, 3_000), cast(25760, 6_000)];
    expect(unpaidAt('GNB', casts)).toEqual([6_000]);
  });
});

describe('gaugeAtPull', () => {
  it('gives what their casts as played needed at the pull', () => {
    expect(gaugeAtPull('WAR', [cast(3549, 1_000)], cat())).toBe(50);
    expect(gaugeAtPull('WAR', [cast(52, 500), cast(3549, 1_000)], cat())).toBe(0);
  });
});

describe('allPaid', () => {
  it('says whether every spend is paid', () => {
    expect(allPaid('WAR', [cast(52, 500), cast(3549, 1_000)], cat(), 0)).toBe(true);
    expect(allPaid('WAR', [cast(3549, 1_000)], cat(), 0)).toBe(false);
  });
});
