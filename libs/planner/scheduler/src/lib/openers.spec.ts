import { action, catalog, pull } from './scheduler-fixtures';
import { openingOf, withDraws } from './opening';
import { withStacksLeft } from './openers';

// One player of each job casting a GCD every 2.5s from the countdown's one
// (landing at 0.5s); the scholar (2) with a Dissipation at 200s.
const timeline = (job: string) => {
  const t = pull([]);
  t.durationMs = 250_000;
  t.players = [{ id: 2, name: 'Heal Main', job, role: 'healer', maxHp: 100_000, stats: null }];
  t.playerCasts = [
    ...Array.from({ length: 14 }, (_, i) => ({ at: 500 + i * 2500, source: 2, target: null, action: 9, castMs: null })),
    { at: 200_000, source: 2, target: null, action: 3587, castMs: null },
  ];
  return t;
};
const cat = () => {
  const c = catalog();
  c.actions.push(action(9, 'Broil IV', ['SCH', 'AST', 'WHM', 'SGE'], 2.5, [], { gcd: true }));
  return c;
};
const steps = (job: string, opener?: 'standard' | 'dissipation-first' | 'double-misery' | 'pneuma' | 'none') =>
  openingOf(timeline(job), cat(), timeline(job).players, opener ? { 2: opener } : {});

describe('openingOf', () => {
  it("weaves a scholar's standard opener after their GCDs: Aetherflow, then Dissipation", () => {
    const o = steps('SCH');
    const opener = o.uses.filter((u) => u.opener);

    // Aetherflow after the 1st GCD (3s + 0.7s), then on cooldown; Dissipation
    // after the 6th, and the one played after the opener.
    expect(o.refills.get(2)).toEqual([3_700, 16_200, 63_700, 123_700, 183_700, 200_000, 243_700]);
    expect(o.dissipations.get(2)).toEqual([16_200, 200_000]);
    expect(opener.map((u) => [u.action, u.at])).toEqual([
      [166, 3_700],
      [7436, 6_200],
      [167, 8_700],
      [167, 11_200],
      [167, 13_700],
      [3587, 16_200],
      [37012, 18_700],
      [167, 21_200],
      [167, 23_700],
      [167, 26_200],
    ]);
    // The later Aetherflows and the Dissipation kept as played show too.
    expect(o.uses.filter((u) => !u.opener).map((u) => [u.action, u.at])).toEqual([
      [166, 63_700],
      [166, 123_700],
      [166, 183_700],
      [166, 243_700],
      [3587, 200_000],
    ]);
  });

  it('swaps them for Dissipation first, and has no steps with none', () => {
    expect(steps('SCH', 'dissipation-first').dissipations.get(2)?.[0]).toBe(3_700);
    const none = steps('SCH', 'none');
    expect(none.uses.filter((u) => u.opener)).toEqual([]);
    expect(none.refills.get(2)?.[0]).toBe(3_700);
    expect(none.dissipations.get(2)).toEqual([200_000]);
  });

  it("brings an astrologian's cards at their draws, two oGCDs after one GCD a weave apart", () => {
    const o = steps('AST');

    // Earthly Star in the countdown; Lord of Crowns and Umbral Draw both
    // after the 4th GCD (10.5s + 0.7s, then a weave later).
    expect(o.uses.find((u) => u.action === 7439)?.at).toBe(-4_000);
    expect(o.uses.filter((u) => u.action === 7444 || u.action === 37018).map((u) => u.at)).toEqual([11_200, 11_900]);
    // Astral Draw before the pull, Umbral at 11.9s, then in turn.
    expect(o.draws.get(2)).toEqual({ astral: [0, 66_900, 176_900], umbral: [11_900, 121_900, 231_900] });
    const bole = { player: 2, pool: { name: 'the Bole', gainMs: 110_000, max: 1 } };
    expect(withDraws([bole], o)[0].pool?.refills).toEqual([11_900, 121_900, 231_900]);
  });

  it("has a white mage's Assize and Afflatus Misery, and the Raptures of a Double Misery", () => {
    expect(steps('WHM').uses.map((u) => [u.action, u.at])).toEqual([
      [136, 8_700],
      [3571, 11_200],
      [16535, 13_000],
    ]);
    const double = steps('WHM', 'double-misery').uses;
    expect(double.filter((u) => u.action === 16534).map((u) => u.at)).toEqual([20_500, 23_000, 25_500]);
    expect(double.filter((u) => u.action === 16535).map((u) => u.at)).toEqual([13_000, 28_000]);
  });

  it("has the tanks' buffs and enablers at their GCDs, a dark knight's The Blackest Night in the countdown", () => {
    const at = (job: string) => steps(job).uses.map((u) => [u.action, u.at]);

    expect(at('PLD')).toEqual([[20, 8_700]]); // Fight or Flight after Royal Authority
    // Infuriate after the precast Tomahawk, Inner Release after Storm's
    // Eye, Infuriate after the third Fell Cleave and after the last of
    // these GCDs (13th; the 14th's time, as if every 2.5s).
    expect(at('WAR')).toEqual([
      [52, 1_200],
      [7389, 8_700],
      [52, 23_700],
      [52, 35_700],
    ]);
    expect(at('DRK')).toEqual([
      [7393, -3_000],
      [7390, 8_700],
    ]);
    expect(at('GNB')).toEqual([
      [16164, 1_200],
      [16138, 6_200],
    ]);
  });

  it("has a sage's Pneuma precast in the Pneuma opener only", () => {
    expect(steps('SGE').uses.map((u) => u.action)).toEqual([37033]);
    expect(steps('SGE', 'pneuma').uses.map((u) => [u.action, u.at])).toEqual([
      [24318, 500],
      [37033, 13_700],
    ]);
  });
});

describe('withStacksLeft', () => {
  const drain = (at: number) => ({
    player: 2,
    action: 167,
    name: 'Energy Drain',
    at,
    target: null,
    covers: [],
    opener: true,
  });
  const chain = { player: 2, action: 7436, name: 'Chain Stratagem', at: 6_000, target: null, covers: [], opener: true };

  it('drops the latest Energy Drains of a refill for the stacks its heals take', () => {
    // Aetherflow at 3s, Dissipation at 16s; a Sacred Soil at 8s.
    const uses = [chain, drain(9_000), drain(11_000), drain(13_000), drain(21_000), drain(23_000), drain(26_000)];

    expect(withStacksLeft(uses, [3_000, 16_000], [8_000]).map((u) => u.at)).toEqual([
      6_000, 9_000, 11_000, 21_000, 23_000, 26_000,
    ]);
  });
});
