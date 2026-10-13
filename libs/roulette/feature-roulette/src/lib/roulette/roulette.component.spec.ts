import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_URL } from '@everise/core/http-client';
import { RouletteStore } from '@everise/roulette/data-access';
import { RouletteComponent } from './roulette.component';

describe('RouletteComponent', () => {
  let fixture: ComponentFixture<RouletteComponent>;
  let http: HttpTestingController;

  // The page, opened at `url` (its query string holds the settings).
  async function open(url = '/') {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [RouletteComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '/api' },
      ],
    }).compileComponents();
    await TestBed.inject(Router).navigateByUrl(url);

    fixture = TestBed.createComponent(RouletteComponent);
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  }

  beforeEach(() => open());

  // The page's own store (it provides one).
  function store() {
    return fixture.debugElement.injector.get(RouletteStore);
  }

  function text() {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  // The titles on a reel (0: type, 1: duty, 2: party settings).
  function reelTitles(reel: number) {
    const reels = (fixture.nativeElement as HTMLElement).querySelectorAll('cdt-roulette-reel');
    return [...new Set([...reels[reel].querySelectorAll('.slot .title')].map((t) => t.textContent?.trim()))];
  }

  async function load(jobs: 'ok' | 'missing' = 'ok') {
    http.expectOne('/api/duties').flush({
      fetchedAt: '2026-10-04T00:00:00Z',
      groups: [
        {
          id: 1,
          name: 'Dungeons',
          order: 0,
          icon: 61801,
          duties: [{ id: 1, name: 'Sastasha', level: 15, finder: 'Duty Finder', minimumIL: true, roulettes: [] }],
        },
        {
          id: 16,
          name: 'Gold Saucer',
          order: 1,
          icon: null,
          duties: [
            { id: 7, name: 'LoVM: Master Battle', level: 1, finder: '', roulettes: [] },
            { id: 8, name: 'Triple Triad: Open Tournament', level: 1, finder: '', roulettes: [] },
          ],
        },
      ],
    });
    http.expectOne('/api/roulettes').flush({
      fetchedAt: '2026-10-04T00:00:00Z',
      icon: 61807,
      roulettes: [{ id: 1, name: 'Duty Roulette: Leveling', level: 16, joinPartyInProgress: true }],
    });
    const jobsRequest = http.expectOne('/api/jobs');
    if (jobs === 'ok') {
      jobsRequest.flush({
        fetchedAt: '2026-10-04T00:00:00Z',
        jobs: [
          { id: 19, name: 'Paladin', role: 'Tank', limited: false, icon: 62119 },
          { id: 36, name: 'Blue Mage', role: 'Magical Ranged DPS', limited: true, icon: 62136 },
        ],
      });
    } else {
      jobsRequest.flush(null, { status: 404, statusText: 'Not Found' });
    }
    await fixture.whenStable();
  }

  // The page's query, as an object.
  function query() {
    return Object.fromEntries(new URL(TestBed.inject(Router).url, 'https://everise.dev').searchParams);
  }

  it('keeps the settings in the query string by id, and nothing for nothing ticked', async () => {
    await load();
    expect(TestBed.inject(Router).url).toBe('/');

    store().setLevel('minLevel', '50');
    store().toggleType('Dungeons', true);
    await fixture.whenStable();
    expect(query()).toEqual({ min: '50', types: '1' });

    store().setLevel('minLevel', '');
    store().toggleType('Dungeons', false);
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('opens with the settings a link asks for', async () => {
    await open('/?types=1&max=40');
    await load();

    expect(store().settings().types).toEqual(['Dungeons']);
    expect(store().settings().maxLevel).toBe(40);
    expect(store().isTypeOn('Duty Roulettes')).toBe(false);
  });

  it("drops a picked type's ticks from the query string when the type is turned off", async () => {
    await load();

    store().toggleType('Gold Saucer', true);
    await fixture.whenStable();
    expect(query()).toEqual({ types: '16', goldSaucer: 'd7,d8' });

    store().togglePick('Gold Saucer', 'duty:7', false);
    await fixture.whenStable();
    expect(query()).toEqual({ types: '16', goldSaucer: 'd8' });

    store().toggleType('Gold Saucer', false);
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/');
    expect(store().isPicked('Gold Saucer', 'duty:8')).toBe(false);
  });

  it('rewrites a link to what the page shows', async () => {
    await open('/?types=1,99&goldSaucer=d7&roulettes=r1');
    await load();

    expect(query()).toEqual({ types: '1' });
    expect(store().settings().picks).toEqual({ 'Duty Roulettes': [], PvP: [], 'Gold Saucer': [] });
  });

  it('follows the query string when it changes (Back, Forward, a link)', async () => {
    await load();

    await TestBed.inject(Router).navigateByUrl('/?types=1,0&roulettes=r1');
    await fixture.whenStable();
    expect(store().settings().types).toEqual(['Dungeons', 'Duty Roulettes']);
    expect(store().isPicked('Duty Roulettes', 'roulette:1')).toBe(true);

    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    expect(store().settings().types).toEqual([]);
  });

  it('has an Idle animations switch, on by default, that stops the idle reels and the crystal', async () => {
    await load();
    const page = fixture.nativeElement as HTMLElement;
    const toggle = page.querySelector('cdt-switch button') as HTMLButtonElement;
    expect(toggle.getAttribute('role')).toBe('switch');
    expect(toggle.textContent).toContain('Idle animations');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(page.querySelector('.hero-crystal')?.classList).not.toContain('paused');

    toggle.click();
    await fixture.whenStable();

    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(page.querySelector('.hero-crystal')?.classList).toContain('paused');
    expect(page.querySelector('.strip.idle.moving')).toBeNull();
  });

  it('reads the duties again once the game day ends, for the next Frontline map', async () => {
    const frontline = (name: string) => ({
      id: 2,
      name,
      level: 30,
      pvp: true,
      pvpType: 'Frontline',
      activeFrontline: true,
      roulettes: [],
    });
    // The reset has just passed.
    http.expectOne('/api/duties').flush({
      fetchedAt: null,
      dayEndsAt: new Date(Date.now() - 2000).toISOString(),
      groups: [{ id: 15, name: 'PvP', order: 0, duties: [frontline('Seal Rock (Seize)')] }],
    });
    http.expectOne('/api/roulettes').flush({ fetchedAt: null, roulettes: [] });
    http.expectOne('/api/jobs').flush({ fetchedAt: null, jobs: [] });
    await fixture.whenStable();
    expect(store().frontlineMap()).toBe('Seal Rock (Seize)');

    await new Promise((resolve) => setTimeout(resolve, 20));
    http.expectOne('/api/duties').flush({
      fetchedAt: null,
      dayEndsAt: new Date(Date.now() + 86_400_000).toISOString(),
      groups: [{ id: 15, name: 'PvP', order: 0, duties: [frontline('the Borderland Ruins (Secure)')] }],
    });
    await fixture.whenStable();

    expect(store().frontlineMap()).toBe('the Borderland Ruins (Secure)');
    // In the reader's time zone, so only its shape is known.
    expect(store().frontlineChangesAt()).toMatch(/\d/);
    // Nothing more until the next day.
    await new Promise((resolve) => setTimeout(resolve, 20));
    http.expectNone('/api/duties');
  });

  it('starts with nothing ticked and Commence disabled, until a duty type is picked', async () => {
    await load();

    expect(text()).toContain('Dungeons');
    expect(text()).toContain('Duty Roulettes');
    expect(store().settings().types).toEqual([]);
    expect(text()).toContain('Tick at least one duty type to spin.');
    const commence = () => (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button.commence');
    expect(commence()?.disabled).toBe(true);

    store().toggleType('Duty Roulettes', true);
    await fixture.whenStable();

    // Its usual roulettes are ticked with it, so there's something to land on.
    expect(store().isPicked('Duty Roulettes', 'roulette:1')).toBe(true);
    expect(commence()?.disabled).toBe(false);
  });

  it("shows each duty type's icon from the backend", async () => {
    await load();

    const icons = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLImageElement>('.type-icon')].map(
      (img) => img.getAttribute('src'),
    );
    expect(icons).toEqual(['/api/images/61801', '/api/images/61807']);
  });

  it("offers the same job and dealer's choice on the third reel", async () => {
    await open('/?types=1,0&roulettes=r1');
    await load();

    expect(reelTitles(2)).toEqual([
      'Min IL + Silence Echo',
      'Join Party in Progress',
      'Everyone on the same job',
      "Everyone on the same job: dealer's choice",
      'Regular',
    ]);
  });

  it("leaves out dealer's choice when the backend has no jobs", async () => {
    await load('missing');

    expect(reelTitles(2)).toContain('Everyone on the same job');
    expect(reelTitles(2)).not.toContain("Everyone on the same job: dealer's choice");
  });

  it('explains when the lists have not been downloaded yet', async () => {
    http.expectOne('/api/duties').flush({ fetchedAt: null, groups: [] });
    http.expectOne('/api/roulettes').flush({ fetchedAt: null, roulettes: [] });
    http.expectOne('/api/jobs').flush({ fetchedAt: null, jobs: [] });
    await fixture.whenStable();

    expect(text()).toContain("hasn't been downloaded yet");
  });

  afterEach(() => http.verify());
});
