import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PartyFinderBoard, PartyFinderListing } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { PartyFinderComponent } from './party-finder.component';

const ODIN = { id: 66, name: 'Odin' };
const SHIVA = { id: 67, name: 'Shiva' };
const LIGHT_WORLDS = [{ id: 402, name: 'Alpha' }, ODIN, SHIVA];

function listing(id: string, changes: Partial<PartyFinderListing> = {}): PartyFinderListing {
  return {
    id,
    recruiter: 'Tataru Taru',
    description: 'Prog from P3',
    world: ODIN,
    homeWorld: SHIVA,
    category: 'HighEndDuty',
    duty: 'The Unending Coil of Bahamut (Ultimate)',
    dutyIcon: 61832,
    level: 50,
    sortKey: 1,
    highEnd: true,
    worldOnly: false,
    onePlayerPerJob: true,
    beginnersWelcome: true,
    minItemLevel: 0,
    objective: 'practice',
    dutyComplete: false,
    loot: 'normal',
    parties: 1,
    slots: [
      { job: 'PLD', icon: 62119, roles: [], accepts: [] },
      {
        job: null,
        icon: null,
        roles: ['healer', 'dps'],
        accepts: [
          { role: 'healer', jobs: ['WHM', 'SGE'] },
          { role: 'dps', jobs: ['BLM'] },
        ],
      },
    ],
    updatedAt: new Date(Date.now() - 120000).toISOString(),
    expiresAt: new Date(Date.now() + 52.5 * 60000).toISOString(),
    ...changes,
  };
}

function board(changes: Partial<PartyFinderBoard> = {}): PartyFinderBoard {
  return {
    dataCentre: 'Light',
    worlds: LIGHT_WORLDS,
    regions: [
      { name: 'Europe', dataCentres: ['Light', 'Chaos'] },
      { name: 'North America', dataCentres: ['Aether', 'Crystal', 'Dynamis', 'Primal'] },
      { name: 'Japan', dataCentres: ['Elemental', 'Gaia', 'Mana', 'Meteor'] },
      { name: 'Oceania', dataCentres: ['Materia'] },
    ],
    fetchedAt: new Date().toISOString(),
    icons: { tank: 62581, healer: 62582, dps: 62583, beginner: 61523 },
    listings: [
      listing('66-1'),
      listing('67-2', {
        category: 'TheHunt',
        duty: null,
        dutyIcon: 61819,
        level: null,
        sortKey: null,
        worldOnly: true,
        world: SHIVA,
      }),
      listing('66-3', {
        category: 'None',
        duty: null,
        dutyIcon: null,
        level: null,
        sortKey: null,
        description: 'Chatting at the Aetheryte',
      }),
    ],
    ...changes,
  };
}

describe('PartyFinderComponent', () => {
  async function render() {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [PartyFinderComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '' }],
    });
    const fixture = TestBed.createComponent(PartyFinderComponent);
    const http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const titles = () => [...page.querySelectorAll('cdt-pf-listing h3')].map((h) => h.textContent?.trim());
    const select = (id: string) => page.querySelector(`#${id}`) as HTMLSelectElement;
    const change = async (id: string, value: string) => {
      select(id).value = value;
      select(id).dispatchEvent(new Event('change'));
      await fixture.whenStable();
    };
    return { fixture, http, page, titles, select, change };
  }

  afterEach(() => localStorage.clear());

  it('starts on Light, from Odin, without listings that have no duty', async () => {
    const { fixture, http, page, titles, select } = await render();

    http.expectOne('/party-finder?dataCentre=Light').flush(board());
    await fixture.whenStable();

    expect(select('pf-data-centre').value).toBe('Light');
    expect(select('pf-world').value).toBe('66');
    // Shiva's world-only Hunt can't be joined from Odin; the chat has no duty.
    expect(titles()).toEqual(['The Unending Coil of Bahamut (Ultimate)']);
    expect(page.querySelector('.summary')?.textContent).toContain('1 of 3 listings on Light');
    const card = page.querySelector('cdt-pf-listing') as HTMLElement;
    expect(card.textContent).toContain('52 min left');
    // The duty type's icon and the sprout before the title, the conditions in
    // brackets, where the party is.
    expect(card.querySelector('h3 .duty-icon')?.getAttribute('src')).toBe('/images/61832');
    expect(card.querySelector('h3 .sprout')?.getAttribute('alt')).toBe('Beginners welcome:');
    expect(card.querySelector('h3 .sprout')?.getAttribute('src')).toBe('/images/61523');
    expect(card.querySelector('.conditions')?.textContent?.replace(/\s+/g, '')).toBe('[Practice][OnePlayerperJob]');
    expect(card.querySelector('.facts')?.textContent?.replace(/\s+/g, ' ')).toContain('Location Odin');
    expect(card.querySelector('.facts')?.textContent).toContain('1 player remaining');
    // A filled slot is its job's icon; an open one its roles, and its jobs in a tooltip.
    const filled = card.querySelector('.slot.filled img') as HTMLImageElement;
    expect(filled.getAttribute('src')).toBe('/images/62119');
    expect(filled.alt).toBe('PLD');
    const open = card.querySelector('.slot.open') as HTMLElement;
    expect(open.textContent?.trim()).toContain('Open: Healer or DPS');
    expect([...open.querySelectorAll('img.role')].map((i) => i.getAttribute('src'))).toEqual([
      '/images/62582',
      '/images/62583',
    ]);
    expect(open.querySelector('[role=tooltip]')?.textContent).toBe('Healer: WHM, SGE · DPS: BLM');
  });

  it('shows listings without a duty with the switch, and every world with "All worlds"', async () => {
    const { fixture, http, page, titles, change } = await render();
    http.expectOne('/party-finder?dataCentre=Light').flush(board());
    await fixture.whenStable();

    const noDuty = page.querySelector('cdt-switch button') as HTMLButtonElement;
    expect(noDuty.textContent?.trim()).toBe('Show listings without a duty');
    noDuty.click();
    await change('pf-world', '');

    expect(titles()).toEqual(['The Unending Coil of Bahamut (Ultimate)', 'The Hunt', 'No duty']);
  });

  it('finds listings by the words typed', async () => {
    const { fixture, http, page, titles } = await render();
    http.expectOne('/party-finder?dataCentre=Light').flush(board());
    await fixture.whenStable();

    const search = page.querySelector('#pf-search') as HTMLInputElement;
    search.value = 'aetheryte';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(titles()).toEqual([]);
    expect(page.querySelector('.notice')?.textContent).toContain('No listings match');
  });

  it("switches to Chaos's listings, and remembers the choice", async () => {
    const { fixture, http, titles, change } = await render();
    http.expectOne('/party-finder?dataCentre=Light').flush(board());
    await fixture.whenStable();

    await change('pf-data-centre', 'Chaos');
    http.expectOne('/party-finder?dataCentre=Chaos').flush(
      board({
        dataCentre: 'Chaos',
        worlds: [{ id: 71, name: 'Moogle' }],
        listings: [listing('71-9', { world: { id: 71, name: 'Moogle' }, duty: 'Sastasha' })],
      }),
    );
    await fixture.whenStable();

    expect(titles()).toEqual(['Sastasha']);
    expect(JSON.parse(localStorage.getItem('partyFinder') ?? '{}').dataCentre).toBe('Chaos');
  });

  it('offers every data centre by region, Europe first', async () => {
    const { fixture, http, select } = await render();
    http.expectOne('/party-finder?dataCentre=Light').flush(board());
    await fixture.whenStable();

    const groups = [...select('pf-data-centre').querySelectorAll('optgroup')];
    expect(groups.map((group) => group.label)).toEqual(['Europe', 'North America', 'Japan', 'Oceania']);
    expect([...groups[0].querySelectorAll('option')].map((option) => option.value)).toEqual(['Light', 'Chaos']);
    expect(select('pf-data-centre').value).toBe('Light');
  });

  it('lists like the game, or in the order picked', async () => {
    const { fixture, http, titles, change } = await render();
    http.expectOne('/party-finder?dataCentre=Light').flush(
      board({
        listings: [
          listing('66-1', { duty: "The Weapon's Refrain (Ultimate)", level: 70, sortKey: 1002 }),
          listing('66-2', { duty: 'Futures Rewritten (Ultimate)', level: 100, sortKey: 1006 }),
          listing('66-3', { category: 'Dungeon', duty: 'Sastasha', dutyIcon: 61801, level: 15, sortKey: 1 }),
        ],
      }),
    );
    await fixture.whenStable();

    expect(titles()).toEqual(['Sastasha', 'Futures Rewritten (Ultimate)', "The Weapon's Refrain (Ultimate)"]);

    await change('pf-sort', 'name');
    expect(titles()).toEqual(['Futures Rewritten (Ultimate)', 'Sastasha', "The Weapon's Refrain (Ultimate)"]);
    expect(JSON.parse(localStorage.getItem('partyFinder') ?? '{}').sort).toBe('name');
  });

  it('shows 20 listings a page, and stays on the page through a refresh', async () => {
    const { fixture, http, page, change } = await render();
    const many = board({
      listings: Array.from({ length: 25 }, (_, i) =>
        listing(`66-${String(i).padStart(2, '0')}`, { recruiter: `Recruiter ${i}` }),
      ),
    });
    http.expectOne('/party-finder?dataCentre=Light').flush(many);
    await fixture.whenStable();

    const tiles = () => page.querySelectorAll('cdt-pf-listing').length;
    const pageButtons = () => [...page.querySelectorAll('cdt-pager button')] as HTMLButtonElement[];
    expect(tiles()).toBe(20);
    expect(pageButtons().map((button) => button.textContent?.trim())).toEqual(['Page 1', 'Page 2']);

    pageButtons()[1].click();
    await fixture.whenStable();
    expect(tiles()).toBe(5);

    (page.querySelector('.status button') as HTMLButtonElement).click();
    http.expectOne('/party-finder?dataCentre=Light').flush(many);
    await fixture.whenStable();
    expect(tiles()).toBe(5);
    expect(pageButtons()[1].getAttribute('aria-current')).toBe('page');

    // A new filter starts from the first page again.
    await change('pf-role', 'dps');
    expect(tiles()).toBe(20);
  });

  it('keeps the listings shown when a refresh fails, and says why', async () => {
    const { fixture, http, page, titles } = await render();
    http.expectOne('/party-finder?dataCentre=Light').flush(board());
    await fixture.whenStable();

    (page.querySelector('.status button') as HTMLButtonElement).click();
    http
      .expectOne('/party-finder?dataCentre=Light')
      .flush(
        { errors: { body: ["The Party Finder listings can't be reached right now. Try again in a minute."] } },
        { status: 502, statusText: 'Bad Gateway' },
      );
    await fixture.whenStable();

    expect(titles()).toEqual(['The Unending Coil of Bahamut (Ultimate)']);
    expect(page.querySelector('cdt-message')?.textContent).toContain("can't be reached right now");
  });
});
