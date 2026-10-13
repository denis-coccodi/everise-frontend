import { convertToParamMap } from '@angular/router';
import {
  PartyFinderSelection,
  dataCentreQuery,
  listingPage,
  selectionFromQuery,
  selectionToQuery,
} from './party-finder-query';

const query = (params: Record<string, string>) => convertToParamMap(params);

// The parameters a selection writes, without the empty ones.
function written(selection: PartyFinderSelection) {
  return Object.fromEntries(
    Object.entries(selectionToQuery(selection)).filter((entry): entry is [string, string] => entry[1] !== null),
  );
}

describe('the Party Finder query string', () => {
  it("opens on Everise's home, Light from Odin, when it names no data centre", () => {
    const home = selectionFromQuery(query({}));

    expect(home.dataCentre).toBe('Light');
    expect(home.filters.world).toBe('odin');
    expect(written(home)).toEqual({ dc: 'light', world: 'odin' });
  });

  it('shows all worlds of a data centre it names without a world, Light too', () => {
    expect(selectionFromQuery(query({ dc: 'light' })).filters.world).toBeNull();
    expect(selectionFromQuery(query({ dc: 'chaos' }))).toMatchObject({ dataCentre: 'Chaos', filters: { world: null } });
  });

  it('names every choice by id, and reads it back', () => {
    const params = {
      dc: 'chaos',
      world: 'moogle',
      category: 'high-end-duty-savage',
      slot: 'healer',
      search: 'the coil',
      sort: 'ending-soon',
      'no-duty': 'show',
      beginners: 'only',
      page: '3',
    };
    const selection = selectionFromQuery(query(params));

    expect(selection).toEqual({
      dataCentre: 'Chaos',
      filters: {
        world: 'moogle',
        category: 'HighEndDuty:Savage',
        role: 'healer',
        search: 'the coil',
        showNoDuty: true,
        beginnersOnly: true,
      },
      sort: 'ending-soon',
      page: 3,
    });
    expect(written(selection)).toEqual(params);
  });

  it('leaves out what is at its default, and what it cannot read', () => {
    const read = selectionFromQuery(
      query({ dc: 'light', world: 'Odin!', slot: 'bard', sort: 'random', page: '-2', beginners: 'yes' }),
    );

    expect(read.filters).toMatchObject({ world: null, role: '', beginnersOnly: false });
    expect(read.sort).toBe('game');
    expect(read.page).toBe(1);
    expect(written(read)).toEqual({ dc: 'light' });
  });

  it('turns categories into ids and back, ones it does not know yet too', () => {
    const category = (id: string) => selectionFromQuery(query({ dc: 'light', category: id })).filters.category;

    expect(category('duty-roulette')).toBe('DutyRoulette');
    expect(category('pvp')).toBe('PvP');
    expect(category('high-end-duty')).toBe('HighEndDuty');
    expect(category('none')).toBe('None');
    expect(category('variant-and-criterion-dungeon')).toBe('VariantAndCriterionDungeon');
    expect(category('cosmic-exploration')).toBe('CosmicExploration');
  });

  it("links to a data centre's page by its id", () => {
    expect(dataCentreQuery('Materia')).toEqual({ dc: 'materia' });
  });

  it("links to a listing's own page by its id", () => {
    expect(listingPage({ id: 'light-1789630212-1' })).toBe('/party-finder/listings/light-1789630212-1');
  });
});
