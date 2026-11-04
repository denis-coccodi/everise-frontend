import { faerieGaugeOf, withAetherflow } from './aetherflow';
import { pull } from './scheduler-fixtures';

const ENERGY_DRAIN = 167;
const LUSTRATE = 189;
const EXCOGITATION = 7434;
const RECITATION = 16542;

// The scholar (2) casting `actions` ([seconds, action]).
function casting(actions: [number, number][]) {
  return {
    ...pull([]),
    playerCasts: actions.map(([at, action]) => ({ at: at * 1000, source: 2, target: null, action, castMs: null })),
  };
}

describe('faerieGaugeOf', () => {
  it('has a Fey Union for each fifth Aetherflow stack spent, none at the pull', () => {
    const timeline = casting([
      [1, 166],
      [2, ENERGY_DRAIN],
      [3, ENERGY_DRAIN],
      [4, ENERGY_DRAIN],
      [11, 3587],
      [12, LUSTRATE],
      [13, EXCOGITATION],
      [20, ENERGY_DRAIN],
    ]);

    expect(faerieGaugeOf(timeline, 2)).toEqual([13_000]);
  });

  it("fills a Fey Union's worth every 100 s past a completed wipe's wipe point, with no stand-in", () => {
    const completed = {
      ...casting([]),
      durationMs: 400_000,
      completion: { from: 150_000, clear: { code: 'Other0000000000a', pullId: 7 }, plannedFrom: [2] },
    };

    expect(faerieGaugeOf(completed, 2)).toEqual([250_000, 350_000]);
    // One with a stand-in spends as that player did.
    expect(faerieGaugeOf({ ...completed, completion: { ...completed.completion, plannedFrom: [] } }, 2)).toEqual([]);
  });

  it("doesn't count an Excogitation Recitation made free", () => {
    const timeline = casting([
      [2, ENERGY_DRAIN],
      [3, ENERGY_DRAIN],
      [4, ENERGY_DRAIN],
      [10, RECITATION],
      [11, EXCOGITATION],
      [12, LUSTRATE],
      [20, ENERGY_DRAIN],
    ]);

    expect(faerieGaugeOf(timeline, 2)).toEqual([20_000]);
  });

  it("gives the scholar's Aetherpact the gauge as earned", () => {
    const timeline = casting([1, 2, 3, 4, 5].map((s): [number, number] => [s, ENERGY_DRAIN]));
    const pool = { name: 'Faerie Gauge', gainMs: 75_000, max: 2 };

    expect(withAetherflow(timeline, [{ player: 2, pool }])[0].pool).toEqual({ ...pool, earned: [5_000] });
  });
});
