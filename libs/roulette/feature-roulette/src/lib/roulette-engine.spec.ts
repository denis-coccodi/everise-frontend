import { Duty, DutyGroup, DutyRoulette } from './duties.models';
import {
  ROULETTES_TYPE,
  RouletteSettings,
  defaultSettings,
  eligibleTypes,
  pickIndex,
  runModes,
} from './roulette-engine';
import { segmentAt, targetRotation } from './wheel/wheel-geometry';

function duty(name: string, level: number, flags: Partial<Duty> = {}): Duty {
  return {
    id: level,
    name,
    finder: 'Duty Finder',
    expansion: 'A Realm Reborn',
    level,
    levelSync: level,
    itemLevel: 0,
    itemLevelSync: 0,
    joinPartyInProgress: false,
    unrestrictedParty: false,
    minimumIL: false,
    explorerMode: false,
    dutyRecorder: false,
    highEnd: false,
    pvp: false,
    pvpType: '',
    activeFrontline: false,
    roulettes: [],
    ...flags,
  };
}

function roulette(id: number, name: string, level: number, flags: Partial<DutyRoulette> = {}): DutyRoulette {
  return {
    id,
    name,
    category: '',
    dutyType: 'Dungeons',
    level,
    joinPartyInProgress: true,
    pvp: false,
    goldSaucer: false,
    ...flags,
  };
}

const groups: DutyGroup[] = [
  { name: 'Dungeons', order: 0, duties: [duty('Sastasha', 15), duty('the Aurum Vale', 47)] },
  { name: 'Raids — Savage', order: 1, duties: [duty('AAC Heavyweight M1 (Savage)', 100)] },
];

const roulettes = [
  roulette(1, 'Duty Roulette: Leveling', 16),
  roulette(2, 'Duty Roulette: Expert', 100),
  roulette(3, 'Chocobo Race: Random', 1, { goldSaucer: true }),
];

function settings(change: Partial<RouletteSettings> = {}): RouletteSettings {
  return {
    types: ['Dungeons', 'Raids — Savage', ROULETTES_TYPE],
    roulettes: [1, 2],
    minLevel: null,
    maxLevel: null,
    ...change,
  };
}

const names = (s: RouletteSettings) => eligibleTypes(groups, roulettes, s).map((o) => [o.name, o.candidates.length]);

describe('eligibleTypes', () => {
  it('lists the allowed types in group order, with duty roulettes last', () => {
    expect(names(settings())).toEqual([
      ['Dungeons', 2],
      ['Raids — Savage', 1],
      [ROULETTES_TYPE, 2],
    ]);
  });

  it('leaves out types that are not allowed', () => {
    expect(names(settings({ types: ['Raids — Savage'] }))).toEqual([['Raids — Savage', 1]]);
  });

  it('applies the level limits to duties and roulettes, dropping types left empty', () => {
    expect(names(settings({ minLevel: 20, maxLevel: 90 }))).toEqual([['Dungeons', 1]]);
    expect(names(settings({ minLevel: 100 }))).toEqual([
      ['Raids — Savage', 1],
      [ROULETTES_TYPE, 1],
    ]);
  });

  it('only offers the selected duty roulettes', () => {
    const options = eligibleTypes(groups, roulettes, settings({ roulettes: [2] }));
    expect(options.at(-1)?.candidates).toEqual([{ kind: 'roulette', roulette: roulettes[1] }]);
  });
});

describe('defaultSettings', () => {
  it('selects the PvE duty roulettes only', () => {
    expect(defaultSettings(roulettes).roulettes).toEqual([1, 2]);
  });
});

describe('runModes', () => {
  it('offers each option the duty allows, and always a regular run', () => {
    const all = duty('Sastasha', 15, { minimumIL: true, unrestrictedParty: true, joinPartyInProgress: true });
    expect(runModes({ kind: 'duty', duty: all })).toEqual([
      'Min IL + Silence Echo',
      'Unsynced',
      'Join Party in Progress',
      'Regular',
    ]);
    expect(runModes({ kind: 'duty', duty: duty('Dancing Mad (Ultimate)', 100) })).toEqual(['Regular']);
  });

  it('offers a duty roulette only Join Party in Progress or a regular run', () => {
    expect(runModes({ kind: 'roulette', roulette: roulettes[0] })).toEqual(['Join Party in Progress', 'Regular']);
    expect(
      runModes({
        kind: 'roulette',
        roulette: roulette(4, 'Duty Roulette: Mentor', 100, { joinPartyInProgress: false }),
      }),
    ).toEqual(['Regular']);
  });
});

describe('pickIndex', () => {
  it('maps the whole random range onto valid indexes', () => {
    expect(pickIndex(4, () => 0)).toBe(0);
    expect(pickIndex(4, () => 0.999999)).toBe(3);
    expect(pickIndex(1, () => 0.5)).toBe(0);
  });
});

describe('wheel geometry', () => {
  it('stops with the chosen segment under the pointer', () => {
    for (const count of [1, 2, 3, 7, 16]) {
      for (let index = 0; index < count; index++) {
        for (const offset of [-0.5, 0, 0.5]) {
          const rotation = targetRotation(123.4, index, count, 5, offset);
          expect(rotation).toBeGreaterThanOrEqual(123.4 + 5 * 360);
          expect(segmentAt(rotation, count)).toBe(index);
        }
      }
    }
  });
});
