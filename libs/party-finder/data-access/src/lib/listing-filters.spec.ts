import { PartyFinderListing } from '@everise/core/api-types';
import {
  PartyFinderFilters,
  categoriesIn,
  categoryName,
  kindOf,
  listingTitle,
  matchesFilters,
} from './listing-filters';

const ODIN = { id: 66, name: 'Odin' };
const SHIVA = { id: 67, name: 'Shiva' };

function listing(changes: Partial<PartyFinderListing> = {}): PartyFinderListing {
  return {
    id: '66-1',
    recruiter: 'Tataru Taru',
    description: 'Prog from P3',
    world: ODIN,
    homeWorld: SHIVA,
    category: 'HighEndDuty',
    duty: 'The Unending Coil of Bahamut (Ultimate)',
    dutyIcon: 61832,
    sortKey: 1,
    highEnd: true,
    worldOnly: false,
    onePlayerPerJob: true,
    beginnersWelcome: false,
    minItemLevel: 0,
    objective: 'practice',
    dutyComplete: false,
    loot: 'normal',
    parties: 1,
    slots: [
      { job: 'PLD', icon: 62119, roles: [], accepts: [] },
      { job: null, icon: null, roles: ['healer'], accepts: [{ role: 'healer', jobs: ['WHM'] }] },
    ],
    updatedAt: '2026-10-07T18:00:00.000Z',
    expiresAt: '2026-10-07T19:00:00.000Z',
    ...changes,
  };
}

const none: PartyFinderFilters = {
  world: null,
  category: '',
  role: '',
  search: '',
  showNoDuty: false,
  beginnersOnly: false,
};

describe('Party Finder filters', () => {
  it('shows from a world what can be joined from it: everything on the data centre, and its own world-only listings', () => {
    const hunt = listing({ category: 'TheHunt', duty: null, worldOnly: true, world: SHIVA });

    expect(matchesFilters(listing({ world: SHIVA }), { ...none, world: ODIN.id })).toBe(true);
    expect(matchesFilters(hunt, { ...none, world: ODIN.id })).toBe(false);
    expect(matchesFilters(hunt, { ...none, world: SHIVA.id })).toBe(true);
    expect(matchesFilters(hunt, none)).toBe(true);
  });

  it('hides listings without a duty unless asked for, or picked as the category', () => {
    const chat = listing({ category: 'None', duty: null });

    expect(matchesFilters(chat, none)).toBe(false);
    expect(matchesFilters(chat, { ...none, showNoDuty: true })).toBe(true);
    expect(matchesFilters(chat, { ...none, category: 'None' })).toBe(true);
  });

  it('filters by category, an open slot for a role, and beginners', () => {
    expect(matchesFilters(listing(), { ...none, category: 'Trial' })).toBe(false);
    expect(matchesFilters(listing(), { ...none, role: 'healer' })).toBe(true);
    // The tank slot is taken.
    expect(matchesFilters(listing(), { ...none, role: 'tank' })).toBe(false);
    expect(matchesFilters(listing(), { ...none, beginnersOnly: true })).toBe(false);
  });

  it('finds every word typed in the duty, description, recruiter or category, in any case', () => {
    expect(matchesFilters(listing(), { ...none, search: 'ucob p3' })).toBe(false);
    expect(matchesFilters(listing(), { ...none, search: 'BAHAMUT p3' })).toBe(true);
    expect(matchesFilters(listing(), { ...none, search: 'tataru high-end' })).toBe(true);
    expect(matchesFilters(listing(), { ...none, search: 'shiva' })).toBe(true);
  });

  it('names categories, and lists the ones present by name with "No duty" last, high-end duties by kind', () => {
    expect(categoryName('VariantAndCriterionDungeon')).toBe('V&C Dungeons');
    expect(categoryName('SomethingNew')).toBe('Something New');
    expect(categoryName('HighEndDuty:Ultimate')).toBe('Ultimate');
    expect(categoryName('HighEndDuty:Other')).toBe('Other high-end');
    expect(listingTitle(listing({ category: 'TheHunt', duty: null }))).toBe('The Hunt');
    expect(
      categoriesIn([
        listing({ category: 'None' }),
        listing({ category: 'Trial' }),
        listing(),
        listing({ duty: 'The Jade Stoa (Extreme)' }),
        listing({ category: 'Fate' }),
      ]),
    ).toEqual({
      others: ['Fate', 'Trial', 'None'],
      highEnd: ['HighEndDuty:Ultimate', 'HighEndDuty:Extreme'],
    });
  });

  it('tells ultimates, savage raids, extremes and unreals apart, or takes all high-end duty together', () => {
    const duty = (name: string) => listing({ duty: name });
    expect(kindOf(duty('The Unending Coil of Bahamut (Ultimate)'))).toBe('HighEndDuty:Ultimate');
    expect(kindOf(duty('AAC Heavyweight M3 (Savage)'))).toBe('HighEndDuty:Savage');
    expect(kindOf(duty('The Jade Stoa (Extreme)'))).toBe('HighEndDuty:Extreme');
    expect(kindOf(duty("The Minstrel's Ballad: Endsinger's Aria"))).toBe('HighEndDuty:Extreme');
    expect(kindOf(duty("Shinryu's Domain (Unreal)"))).toBe('HighEndDuty:Unreal');
    expect(kindOf(duty('The Cloud of Darkness (Chaotic)'))).toBe('HighEndDuty:Chaotic');
    expect(kindOf(listing({ category: 'Trial', duty: 'The Jade Stoa' }))).toBe('Trial');

    const unreal = duty("Shinryu's Domain (Unreal)");
    expect(matchesFilters(unreal, { ...none, category: 'HighEndDuty:Ultimate' })).toBe(false);
    expect(matchesFilters(unreal, { ...none, category: 'HighEndDuty:Unreal' })).toBe(true);
    expect(matchesFilters(unreal, { ...none, category: 'HighEndDuty' })).toBe(true);
  });
});
