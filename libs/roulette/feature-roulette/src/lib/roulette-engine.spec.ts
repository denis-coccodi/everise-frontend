import { Duty, DutyGroup, DutyRoulette } from './duties.models';
import {
  GOLD_SAUCER_TYPE,
  PVP_TYPE,
  ROULETTES_TYPE,
  RouletteSettings,
  candidateDetail,
  defaultSettings,
  eligibleTypes,
  pickIndex,
  pickOptions,
  runModes,
  shortTypeName,
  typeCandidates,
  upgradeSettings,
} from './roulette-engine';
import { segmentAt, targetRotation } from './wheel/wheel-geometry';

let nextId = 1;

function duty(name: string, level: number, flags: Partial<Duty> = {}): Duty {
  return {
    id: nextId++,
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

const sealRock = duty('Seal Rock (Seize)', 30, { pvp: true, pvpType: 'Frontline', activeFrontline: true });
const hiddenGorge = duty('Hidden Gorge', 30, { pvp: true, pvpType: 'Rival Wings' });
const customMatch = duty('Crystalline Conflict (Custom Match - The Palaistra)', 30, {
  pvp: true,
  pvpType: 'Crystalline Conflict',
});
const lovm = duty('LoVM: Master Battle', 1);

const groups: DutyGroup[] = [
  { name: 'Dungeons', order: 0, duties: [duty('Sastasha', 15), duty('the Aurum Vale', 47)] },
  { name: 'Raids — Ultimate', order: 1, duties: [duty('the Unending Coil of Bahamut (Ultimate)', 70)] },
  {
    name: 'Treasure Hunt',
    order: 2,
    // Not queued through a finder; older data marks Duty Finder settings anyway.
    duties: [duty('the Excitatron 6000', 90, { finder: '', unrestrictedParty: true, minimumIL: true })],
  },
  { name: PVP_TYPE, order: 3, duties: [sealRock, hiddenGorge, customMatch] },
  { name: GOLD_SAUCER_TYPE, order: 4, duties: [lovm] },
];

const roulettes = [
  roulette(1, 'Duty Roulette: Leveling', 16),
  roulette(2, 'Duty Roulette: Expert', 100),
  roulette(3, 'Chocobo Race: Random', 1, { goldSaucer: true, joinPartyInProgress: false }),
  roulette(4, 'Daily Challenge: Frontline', 30, { pvp: true }),
];

const options = pickOptions(groups, roulettes);

function settings(change: Partial<RouletteSettings> = {}): RouletteSettings {
  return {
    ...defaultSettings(options),
    types: ['Dungeons', 'Raids — Ultimate', 'Treasure Hunt', PVP_TYPE, GOLD_SAUCER_TYPE, ROULETTES_TYPE],
    ...change,
  };
}

const names = (s: RouletteSettings) => eligibleTypes(groups, options, s).map((o) => [o.name, o.candidates.length]);

describe('pickOptions', () => {
  const optionNames = (type: string) =>
    options[type].map((o) => (o.candidate.kind === 'duty' ? o.candidate.duty.name : o.candidate.roulette.name));

  it('keeps PvE duty roulettes under Duty Roulettes', () => {
    expect(optionNames(ROULETTES_TYPE)).toEqual(['Duty Roulette: Leveling', 'Duty Roulette: Expert']);
  });

  it('lists PvP queues under PvP, without the Frontline maps', () => {
    expect(optionNames(PVP_TYPE)).toEqual([
      'Daily Challenge: Frontline',
      'Hidden Gorge',
      'Crystalline Conflict (Custom Match - The Palaistra)',
    ]);
  });

  it('lists races and Gold Saucer duties under Gold Saucer', () => {
    expect(optionNames(GOLD_SAUCER_TYPE)).toEqual(['Chocobo Race: Random', 'LoVM: Master Battle']);
  });
});

describe('defaultSettings', () => {
  it('ticks every entry except custom matches', () => {
    const picks = defaultSettings(options).picks;
    expect(picks[ROULETTES_TYPE]).toEqual(['roulette:1', 'roulette:2']);
    expect(picks[PVP_TYPE]).toEqual(['roulette:4', `duty:${hiddenGorge.id}`]);
    expect(picks[GOLD_SAUCER_TYPE]).toEqual(['roulette:3', `duty:${lovm.id}`]);
  });
});

describe('eligibleTypes', () => {
  it('lists the allowed types in group order, with duty roulettes last', () => {
    expect(names(settings())).toEqual([
      ['Dungeons', 2],
      ['Raids — Ultimate', 1],
      ['Treasure Hunt', 1],
      [PVP_TYPE, 2],
      [GOLD_SAUCER_TYPE, 2],
      [ROULETTES_TYPE, 2],
    ]);
  });

  it('leaves out types that are not allowed', () => {
    expect(names(settings({ types: ['Raids — Ultimate'] }))).toEqual([['Raids — Ultimate', 1]]);
  });

  it('applies the level limits, dropping types left empty', () => {
    expect(names(settings({ minLevel: 20, maxLevel: 60 }))).toEqual([
      ['Dungeons', 1],
      [PVP_TYPE, 2],
    ]);
  });

  it('only offers the ticked entries of a picked type', () => {
    const picked = settings({ picks: { ...settings().picks, [PVP_TYPE]: [`duty:${hiddenGorge.id}`] } });
    const pvp = eligibleTypes(groups, options, picked).find((o) => o.name === PVP_TYPE);
    expect(pvp?.candidates).toEqual([{ kind: 'duty', duty: hiddenGorge }]);
  });
});

describe('typeCandidates', () => {
  it('counts every type within the level limits, allowed or not', () => {
    const counts = typeCandidates(groups, options, settings({ types: [], maxLevel: 60 })).map((t) => [
      t.name,
      t.candidates.length,
    ]);
    expect(counts).toEqual([
      ['Dungeons', 2],
      ['Raids — Ultimate', 0],
      ['Treasure Hunt', 0],
      [PVP_TYPE, 2],
      [GOLD_SAUCER_TYPE, 2],
      [ROULETTES_TYPE, 1],
    ]);
  });
});

describe('runModes', () => {
  it('offers each Duty Finder setting the duty allows, and always a regular run', () => {
    const all = duty('Sastasha', 15, { minimumIL: true, unrestrictedParty: true, joinPartyInProgress: true });
    expect(runModes({ kind: 'duty', duty: all })).toEqual([
      'Min IL + Silence Echo',
      'Unsynced',
      'Join Party in Progress',
      'Regular',
    ]);
    expect(runModes({ kind: 'duty', duty: duty('Dancing Mad (Ultimate)', 100) })).toEqual(['Regular']);
  });

  it('offers only a regular run for duties outside the Duty Finder and Raid Finder', () => {
    expect(runModes({ kind: 'duty', duty: groups[2].duties[0] })).toEqual(['Regular']);
  });

  it('offers a roulette only Join Party in Progress, if it allows it, or a regular run', () => {
    expect(runModes({ kind: 'roulette', roulette: roulettes[0] })).toEqual(['Join Party in Progress', 'Regular']);
    expect(runModes({ kind: 'roulette', roulette: roulettes[2] })).toEqual(['Regular']);
  });
});

describe('candidateDetail', () => {
  it("shows today's map for the Frontline daily challenge, and ??? for other roulettes", () => {
    expect(candidateDetail({ kind: 'roulette', roulette: roulettes[3] }, 'Seal Rock (Seize)')).toBe(
      'Today: Seal Rock (Seize)',
    );
    expect(candidateDetail({ kind: 'roulette', roulette: roulettes[0] }, 'Seal Rock (Seize)')).toBe('Duty: ???');
  });
});

describe('shortTypeName', () => {
  it('shortens long type names for the wheel', () => {
    expect(shortTypeName('Raids — Ultimate')).toBe('Ultimate');
    expect(shortTypeName('Variant & Criterion Dungeons')).toBe('V&C');
    expect(shortTypeName('Dungeons')).toBe('Dungeons');
  });
});

describe('upgradeSettings', () => {
  it('keeps types, levels and ticked duty roulettes from the old format', () => {
    const upgraded = upgradeSettings(
      { types: ['Dungeons'], roulettes: [2, 3], minLevel: 50, maxLevel: null },
      defaultSettings(options),
    );
    expect(upgraded.types).toEqual(['Dungeons']);
    expect(upgraded.minLevel).toBe(50);
    // Roulette 3 is a Chocobo race: no longer a duty roulette.
    expect(upgraded.picks[ROULETTES_TYPE]).toEqual(['roulette:2']);
    expect(upgraded.picks[PVP_TYPE]).toEqual(defaultSettings(options).picks[PVP_TYPE]);
  });

  it('falls back to the defaults for missing or broken settings', () => {
    expect(upgradeSettings(null, defaultSettings(options))).toEqual(defaultSettings(options));
    expect(upgradeSettings('x', defaultSettings(options))).toEqual(defaultSettings(options));
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
