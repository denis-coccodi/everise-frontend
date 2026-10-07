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
      { job: 'PLD', roles: [] },
      { job: null, roles: ['healer', 'dps'] },
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
    fetchedAt: new Date().toISOString(),
    listings: [
      listing('66-1'),
      listing('67-2', { category: 'TheHunt', duty: null, worldOnly: true, world: SHIVA }),
      listing('66-3', { category: 'None', duty: null, description: 'Chatting at the Aetheryte' }),
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
    expect(card.textContent).toContain('Beginners welcome');
    expect([...card.querySelectorAll('.slot')].map((s) => s.textContent?.trim())).toEqual([
      'PLD',
      'Open: Healer or DPS',
    ]);
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
