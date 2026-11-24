import { cardsShort, faerieShort, oathShort } from './legality-gauges';
import type { LegalityCast } from './plan-legality.model';

const at = (action: number, s: number, source: LegalityCast['source'] = 'plan'): LegalityCast => ({
  action,
  at: s * 1000,
  source,
});

describe('cardsShort', () => {
  it('plays each card once, from the latest draw of its kind', () => {
    // Astral Draw: the Arrow and the Spire; then Umbral Draw takes the rest away (the Balance), and gives the Bole once.
    const casts = [
      at(37017, 0),
      at(37024, 1),
      at(37025, 2),
      at(37018, 55),
      at(37023, 56),
      at(37027, 57),
      at(37027, 58),
    ];
    expect(cardsShort(casts).map((l) => [l.cast.at, l.needs])).toEqual([
      [56_000, 'Astral Draw'],
      [58_000, 'Umbral Draw'],
    ]);
  });

  it('lets anything go before the first draw', () => {
    expect(cardsShort([at(37023, 1), at(37017, 5)])).toEqual([]);
  });
});

describe('oathShort', () => {
  it('spends 50 a press, full (100) at the pull, 50 more every 21s', () => {
    // Full: two at once; the third needs 21s more.
    expect(oathShort([at(25746, 1), at(7382, 1.5), at(25746, 10)]).map((l) => l.cast.at)).toEqual([10_000]);
    expect(oathShort([at(25746, 1), at(7382, 1.5), at(25746, 23)])).toEqual([]);
  });
});

describe('faerieShort', () => {
  it('needs 10 Faerie Gauge for Aetherpact, empty at the pull, 10 a stack spent', () => {
    expect(faerieShort([at(7437, 5)]).map((l) => l.needs)).toEqual(['10 Faerie Gauge']);
    expect(faerieShort([at(167, 2), at(7437, 5)])).toEqual([]);
  });

  it("drains 10 a tick while the union holds: the plan's 4 ticks, the log's until Dissolve Union", () => {
    // 5 stacks (50): the plan's union takes all of it (10 + 4 ticks).
    const fill = [1, 2, 3, 4, 5].map((s) => at(167, s));
    expect(faerieShort([...fill, at(7437, 10), at(7437, 30)])).toHaveLength(1);
    // The log's, dissolved after 1 tick: 30 left for the next.
    const log = [...fill.map((c) => ({ ...c, source: 'log' as const })), at(7437, 10, 'log'), at(7869, 13.5, 'log')];
    expect(faerieShort([...log, at(7437, 30, 'log')])).toEqual([]);
  });
});
