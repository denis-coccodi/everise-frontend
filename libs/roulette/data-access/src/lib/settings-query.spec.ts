import { convertToParamMap } from '@angular/router';
import { DutyGroup } from '@everise/core/api-types';
import { GOLD_SAUCER_TYPE, PVP_TYPE, ROULETTES_TYPE, defaultSettings } from './roulette-engine';
import { dutyTypeIds, level, settingsFromQuery, settingsToQuery } from './settings-query';
import type { RouletteSettings } from './roulette.model';

const group = (id: number, name: string): DutyGroup => ({ id, name, order: id, icon: null, duties: [] });
const types = dutyTypeIds([
  group(1, 'Dungeons'),
  group(7, 'Raids — Savage'),
  group(15, PVP_TYPE),
  group(16, GOLD_SAUCER_TYPE),
]);

const query = (params: Record<string, string>) => convertToParamMap(params);

describe('dutyTypeIds', () => {
  it("lists the groups by the backend's ids, then Duty Roulettes as 0", () => {
    expect(types.map((t) => [t.id, t.name])).toEqual([
      [1, 'Dungeons'],
      [7, 'Raids — Savage'],
      [15, PVP_TYPE],
      [16, GOLD_SAUCER_TYPE],
      [0, ROULETTES_TYPE],
    ]);
  });
});

describe('settingsToQuery', () => {
  it('writes nothing for nothing ticked, so that is plain /roulette', () => {
    expect(Object.values(settingsToQuery(defaultSettings(), types)).every((value) => value === null)).toBe(true);
  });

  it('names the types by id and the ticked entries by short key', () => {
    const settings: RouletteSettings = {
      types: ['Dungeons', GOLD_SAUCER_TYPE, ROULETTES_TYPE],
      picks: { [ROULETTES_TYPE]: ['roulette:1'], [PVP_TYPE]: [], [GOLD_SAUCER_TYPE]: ['roulette:3', 'duty:7'] },
      minLevel: 50,
      maxLevel: null,
    };

    expect(settingsToQuery(settings, types)).toEqual({
      types: '1,16,0',
      roulettes: 'r1',
      pvp: null,
      goldSaucer: 'r3,d7',
      min: '50',
      max: null,
    });
  });
});

describe('settingsFromQuery', () => {
  it('reads back what settingsToQuery wrote', () => {
    const settings: RouletteSettings = {
      types: ['Dungeons', PVP_TYPE, ROULETTES_TYPE],
      picks: { [ROULETTES_TYPE]: ['roulette:2'], [PVP_TYPE]: ['roulette:40', 'duty:123'], [GOLD_SAUCER_TYPE]: [] },
      minLevel: 50,
      maxLevel: 90,
    };
    const written = settingsToQuery(settings, types);
    const params = Object.fromEntries(
      Object.entries(written).filter((entry): entry is [string, string] => entry[1] !== null),
    );

    expect(settingsFromQuery(query(params), types)).toEqual(settings);
  });

  it('reads nothing ticked from an empty query', () => {
    expect(settingsFromQuery(query({}), types)).toEqual(defaultSettings());
  });

  it('leaves out what it cannot read: unknown ids and keys, levels that are not numbers', () => {
    const read = settingsFromQuery(query({ types: '1,99,Dungeons', roulettes: 'r2,x9,,d', min: 'abc' }), types);

    expect(read.types).toEqual(['Dungeons']);
    expect(read.picks[ROULETTES_TYPE]).toEqual(['roulette:2']);
    expect(read.minLevel).toBeNull();
  });
});

describe('level', () => {
  it('is a whole level from 1 to 100, or none', () => {
    expect(level('')).toBeNull();
    expect(level('abc')).toBeNull();
    expect(level('42.7')).toBe(42);
    expect(level('0')).toBe(1);
    expect(level('250')).toBe(100);
  });
});
