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
    level: 90,
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
  it('lists like the game: by tab, high-end duty by kind, the highest level first, no duty last', () => {
    const none = { duty: null, dutyIcon: null, level: null, sortKey: null };
    const listings = [
      listing('none', { ...none, category: 'None' }),
      listing('top', { category: 'HighEndDuty', duty: 'The Omega Protocol (Ultimate)', level: 90, sortKey: 1005 }),
      listing('unmaking', { category: 'HighEndDuty', duty: 'The Unmaking (Extreme)', level: 100, sortKey: 247 }),
      listing('m4s', { category: 'HighEndDuty', duty: 'AAC Light-heavyweight M4 (Savage)', level: 100, sortKey: 201 }),
      listing('twr', { category: 'HighEndDuty', duty: "The Weapon's Refrain (Ultimate)", level: 70, sortKey: 1002 }),
      listing('dsr', { category: 'HighEndDuty', duty: "Dragonsong's Reprise (Ultimate)", level: 90, sortKey: 1004 }),
      listing('map', { ...none, category: 'TreasureHunt', duty: 'Timeworn Gazelleskin Map' }),
      listing('abyssos', { level: 90, sortKey: 153 }),
      listing('anabaseios', { duty: 'Anabaseios: The Ninth Circle', level: 90, sortKey: 154 }),
      // A higher level beats a newer duty.
      listing('sastasha', { category: 'Dungeon', duty: 'Sastasha', level: 15, sortKey: 300 }),
      listing('aurum', { category: 'Dungeon', duty: 'The Aurum Vale', level: 47, sortKey: 20 }),
      listing('roulette', { ...none, category: 'DutyRoulette', duty: 'Duty Roulette: Leveling' }),
    ];

    expect(ids(sortListings(listings, 'game'))).toEqual([
      'roulette',
      'aurum',
      'sastasha',
      'anabaseios',
      'abyssos',
      'm4s',
      'top',
      'dsr',
      'twr',
      'unmaking',
      'map',
      'none',
    ]);
  });

  it("lists one duty's listings by time left, the least first", () => {
    const later = listing('a', { expiresAt: '2026-10-08T10:30:00.000Z' });
    const sooner = listing('b', { expiresAt: '2026-10-08T09:30:00.000Z' });

    expect(ids(sortListings([later, sooner], 'game'))).toEqual(['b', 'a']);
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
