import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DiscordSharingService } from '@everise/articles/data-access';
import { AuthStore } from '@everise/auth/data-access';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { PartyFinderBoard, PartyFinderListing, User } from '@everise/core/api-types';
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
  // The page as the app routes it: /party-finder, or a data centre's own.
  async function render(url = '/party-finder', { signedIn = false, discord = true } = {}) {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        // Whether the backend can share in the Everise Discord.
        { provide: DiscordSharingService, useValue: { available: signal(discord) } },
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
        provideRouter(
          [
            { path: 'party-finder', component: PartyFinderComponent },
            { path: 'party-finder/:dataCentre', component: PartyFinderComponent },
          ],
          withComponentInputBinding(),
        ),
      ],
    });
    if (signedIn) TestBed.inject(AuthStore).confirmed({ id: 'u1', username: 'alisaie' } as User);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    const fixture = harness.fixture;
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
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/party-finder/chaos');
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

  it("opens the data centre in the address, without making it the member's choice", async () => {
    const { fixture, http, page, select } = await render('/party-finder/chaos');
    http.expectOne('/party-finder?dataCentre=Chaos').flush(board({ dataCentre: 'Chaos', worlds: [] }));
    await fixture.whenStable();

    expect(select('pf-data-centre').value).toBe('Chaos');
    expect(page.querySelector('.data-centres [aria-current=page]')?.textContent?.trim()).toBe('Chaos');
    expect(localStorage.getItem('partyFinder')).toBeNull();
  });

  it("links to every data centre's page, and invites guests to join", async () => {
    const { fixture, http, page } = await render();
    http.expectOne('/party-finder?dataCentre=Light').flush(board());
    await fixture.whenStable();

    const nav = page.querySelector('nav.data-centres') as HTMLElement;
    expect(nav.getAttribute('aria-labelledby')).toBe('pf-data-centres');
    expect([...nav.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toContain('/party-finder/materia');
    expect(page.querySelector('.join a')?.getAttribute('href')).toBe('/register');
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

  describe('sharing a listing', () => {
    const buttons = (page: HTMLElement) =>
      [...page.querySelectorAll('cdt-pf-listing .share button')].map((b) => b.textContent?.replace(/\s+/g, ' ').trim());

    it("isn't offered to guests", async () => {
      const { fixture, http, page } = await render();
      http.expectOne('/party-finder?dataCentre=Light').flush(board());
      await fixture.whenStable();

      expect(buttons(page)).toEqual([]);
      expect(page.querySelector('.join')?.textContent).toContain('share listings');
    });

    it('posts it with a message and, when ticked, in the Discord too, then links to the post', async () => {
      const { fixture, http, page } = await render('/party-finder', { signedIn: true });
      http.expectOne('/party-finder?dataCentre=Light').flush(board());
      await fixture.whenStable();
      // Each button names its listing for screen readers.
      expect(buttons(page)).toEqual([
        'Share The Unending Coil of Bahamut (Ultimate) as post',
        'Share The Unending Coil of Bahamut (Ultimate) to Discord',
      ]);

      (page.querySelector('cdt-pf-listing .share button') as HTMLButtonElement).click();
      await fixture.whenStable();
      const dialog = page.querySelector('cdt-pf-share-dialog') as HTMLElement;
      expect(dialog.querySelector('[role=dialog] h2')?.textContent).toBe('Share as post');
      const message = dialog.querySelector('textarea') as HTMLTextAreaElement;
      message.value = '  Come prog!  ';
      message.dispatchEvent(new Event('input'));
      (dialog.querySelector('cdt-checkbox input') as HTMLInputElement).click();
      await fixture.whenStable();
      (dialog.querySelector('button[type=submit]') as HTMLButtonElement).click();

      const request = http.expectOne('/party-finder/posts');
      expect(JSON.parse(request.request.body)).toEqual({
        dataCentre: 'Light',
        listingId: '66-1',
        comment: 'Come prog!',
        shareToDiscord: true,
      });
      request.flush({ article: { id: 'post-9' } }, { status: 201, statusText: 'Created' });
      await fixture.whenStable();

      expect(page.querySelector('cdt-pf-share-dialog')).toBeNull();
      const done = page.querySelector('.shared') as HTMLElement;
      expect(done.textContent).toContain('Posted to the feed.');
      expect(done.querySelector('a')?.getAttribute('href')).toBe('/article/post-9');
    });

    it('sends it to the Discord only, and keeps the window open with the reason when it fails', async () => {
      const { fixture, http, page } = await render('/party-finder', { signedIn: true });
      http.expectOne('/party-finder?dataCentre=Light').flush(board());
      await fixture.whenStable();

      (page.querySelectorAll('cdt-pf-listing .share button')[1] as HTMLButtonElement).click();
      await fixture.whenStable();
      const dialog = page.querySelector('cdt-pf-share-dialog') as HTMLElement;
      expect(dialog.querySelector('[role=dialog] h2')?.textContent).toBe('Share to Discord');
      // Already going to Discord: no "also" box.
      expect(dialog.querySelector('cdt-checkbox')).toBeNull();
      (dialog.querySelector('button[type=submit]') as HTMLButtonElement).click();

      http
        .expectOne('/party-finder/discord')
        .flush(
          { errors: { body: ['You can share another listing in 42 seconds.'] } },
          { status: 429, statusText: 'Too Many Requests' },
        );
      await fixture.whenStable();
      expect(dialog.querySelector('[role=alert]')?.textContent).toContain('42 seconds');

      (dialog.querySelector('button[type=submit]') as HTMLButtonElement).click();
      const request = http.expectOne('/party-finder/discord');
      expect(JSON.parse(request.request.body)).toEqual({ dataCentre: 'Light', listingId: '66-1' });
      request.flush({ shared: true }, { status: 202, statusText: 'Accepted' });
      await fixture.whenStable();
      expect(page.querySelector('.shared')?.textContent).toContain('Sent to the Everise Discord.');
    });

    it("doesn't offer Discord where the site can't share there", async () => {
      const { fixture, http, page } = await render('/party-finder', { signedIn: true, discord: false });
      http.expectOne('/party-finder?dataCentre=Light').flush(board());
      await fixture.whenStable();

      expect(buttons(page)).toEqual(['Share The Unending Coil of Bahamut (Ultimate) as post']);
    });
  });
});
