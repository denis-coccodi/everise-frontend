import { convertToParamMap } from '@angular/router';
import { GOLD_SAUCER_TYPE, PVP_TYPE, ROULETTES_TYPE, RouletteSettings } from './roulette-engine';
import { settingsFromQuery, settingsToQuery } from './settings-query';

const defaults: RouletteSettings = {
  types: ['Dungeons', 'Trials — Normal', ROULETTES_TYPE],
  picks: {
    [ROULETTES_TYPE]: ['roulette:1', 'roulette:2'],
    [PVP_TYPE]: ['roulette:40', 'duty:123'],
    [GOLD_SAUCER_TYPE]: ['duty:7'],
  },
  minLevel: null,
  maxLevel: null,
};

const query = (params: Record<string, string>) => convertToParamMap(params);

describe('settingsToQuery', () => {
  it('writes nothing for the defaults, so the default roulette is plain /roulette', () => {
    expect(Object.values(settingsToQuery(defaults, defaults)).every((value) => value === null)).toBe(true);
  });

  it('writes only what differs, with short keys for the ticked entries', () => {
    const settings: RouletteSettings = {
      ...defaults,
      types: ['Dungeons', 'Raids — Savage'],
      picks: { ...defaults.picks, [PVP_TYPE]: ['duty:123'] },
      minLevel: 50,
    };

    expect(settingsToQuery(settings, defaults)).toEqual({
      types: 'Dungeons,Raids — Savage',
      roulettes: null,
      pvp: 'd123',
      goldSaucer: null,
      min: '50',
      max: null,
    });
  });

  it('keeps the same types in another order as the defaults', () => {
    const reordered = { ...defaults, types: [...defaults.types].reverse() };
    expect(settingsToQuery(reordered, defaults).types).toBeNull();
  });

  it('writes an empty list when everything of a kind is unticked', () => {
    const none = { ...defaults, types: [], picks: { ...defaults.picks, [ROULETTES_TYPE]: [] } };
    expect(settingsToQuery(none, defaults)).toMatchObject({ types: '', roulettes: '' });
  });
});

describe('settingsFromQuery', () => {
  it('reads back what settingsToQuery wrote', () => {
    const settings: RouletteSettings = {
      types: ['Dungeons', 'Raids — Savage'],
      picks: { ...defaults.picks, [ROULETTES_TYPE]: ['roulette:2'], [GOLD_SAUCER_TYPE]: [] },
      minLevel: 50,
      maxLevel: 90,
    };
    const written = settingsToQuery(settings, defaults);
    const params = Object.fromEntries(
      Object.entries(written).filter((entry): entry is [string, string] => entry[1] !== null),
    );

    expect(settingsFromQuery(query(params), defaults)).toEqual(settings);
  });

  it('uses the defaults for what the query leaves out', () => {
    expect(settingsFromQuery(query({}), defaults)).toEqual(defaults);
  });

  it('ignores what it cannot read: unknown keys, levels that are not numbers, and keeps levels within 1–100', () => {
    const read = settingsFromQuery(query({ roulettes: 'r2,x9,,d', min: 'abc', max: '250' }), defaults);

    expect(read.picks[ROULETTES_TYPE]).toEqual(['roulette:2']);
    expect(read.minLevel).toBeNull();
    expect(read.maxLevel).toBe(100);
  });

  it('gives a picked type a link turns on without naming its entries its usual ones', () => {
    const usual = (type: string) => (type === ROULETTES_TYPE ? ['roulette:9'] : []);
    const read = settingsFromQuery(query({ types: ROULETTES_TYPE }), defaults, usual);

    expect(read.picks[ROULETTES_TYPE]).toEqual(['roulette:9']);
    expect(
      settingsFromQuery(query({ types: ROULETTES_TYPE, roulettes: '' }), defaults, usual).picks[ROULETTES_TYPE],
    ).toEqual([]);
  });
});
