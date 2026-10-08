import { PartyFinderListing } from '@everise/core/api-types';
import { isSortOrder, sortListings } from './listing-sort';

function listing(id: string, changes: Partial<PartyFinderListing> = {}): PartyFinderListing {
  return {
    id,
    recruiter: 'Tataru Taru',
    description: '',
    world: { id: 66, name: 'Odin' },
    homeWorld: { id: 66, name: 'Odin' },
    category: 'Raid',
    duty: 'Abyssos: The Fifth Circle',
    dutyIcon: 61802,
    sortKey: 153,
    highEnd: false,
    worldOnly: false,
    onePlayerPerJob: false,
    beginnersWelcome: false,
    minItemLevel: 0,
    objective: null,
    dutyComplete: false,
    loot: 'normal',
    parties: 1,
    slots: [
      { job: 'PLD', icon: 62119, roles: [], accepts: [] },
      { job: null, icon: null, roles: ['dps'], accepts: [{ role: 'dps', jobs: ['BLM'] }] },
    ],
    updatedAt: '2026-10-08T09:00:00.000Z',
    expiresAt: '2026-10-08T10:00:00.000Z',
    ...changes,
  };
}

const ids = (listings: PartyFinderListing[]) => listings.map((l) => l.id);

describe('sortListings', () => {
  it('lists like the game: by tab, high-end duty by kind, the newest duty first, no duty last', () => {
    const listings = [
      listing('none', { category: 'None', duty: null, dutyIcon: null, sortKey: null }),
      listing('top', { category: 'HighEndDuty', duty: 'The Omega Protocol (Ultimate)', sortKey: 1005 }),
      listing('unmaking', { category: 'HighEndDuty', duty: 'The Unmaking (Extreme)', sortKey: 247 }),
      listing('m4s', { category: 'HighEndDuty', duty: 'AAC Light-heavyweight M4 (Savage)', sortKey: 201 }),
      listing('dsr', { category: 'HighEndDuty', duty: 'Dragonsong’s Reprise (Ultimate)', sortKey: 1004 }),
      listing('map', { category: 'TreasureHunt', duty: 'Timeworn Gazelleskin Map', sortKey: null }),
      listing('abyssos', { sortKey: 153 }),
      listing('anabaseios', { duty: 'Anabaseios: The Ninth Circle', sortKey: 154 }),
      listing('sastasha', { category: 'Dungeon', duty: 'Sastasha', sortKey: 1 }),
      listing('roulette', { category: 'DutyRoulette', duty: 'Duty Roulette: Leveling', sortKey: null }),
    ];

    expect(ids(sortListings(listings, 'game'))).toEqual([
      'roulette',
      'sastasha',
      'anabaseios',
      'abyssos',
      'm4s',
      'top',
      'dsr',
      'unmaking',
      'map',
      'none',
    ]);
  });

  it('keeps listings that compare the same in one order, by id', () => {
    expect(ids(sortListings([listing('b'), listing('a')], 'game'))).toEqual(['a', 'b']);
  });

  it('sorts by time left, last seen, players needed, item level or name', () => {
    const soon = listing('soon', { expiresAt: '2026-10-08T09:10:00.000Z', duty: 'Zeta' });
    const fresh = listing('fresh', { updatedAt: '2026-10-08T09:05:00.000Z', minItemLevel: 690 });
    const full = listing('full', { slots: [{ job: 'PLD', icon: 62119, roles: [], accepts: [] }] });
    const listings = [full, fresh, soon];

    expect(ids(sortListings(listings, 'endingSoon'))[0]).toBe('soon');
    expect(ids(sortListings(listings, 'recent'))[0]).toBe('fresh');
    expect(ids(sortListings(listings, 'fewestNeeded'))[0]).toBe('full');
    expect(ids(sortListings(listings, 'itemLevel'))[0]).toBe('fresh');
    expect(ids(sortListings(listings, 'name'))).toEqual(['fresh', 'full', 'soon']);
  });

  it('knows its orders', () => {
    expect(isSortOrder('game')).toBe(true);
    expect(isSortOrder('random')).toBe(false);
  });
});
