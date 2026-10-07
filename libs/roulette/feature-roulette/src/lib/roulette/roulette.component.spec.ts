import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '@everise/core/http-client';
import { RouletteStore } from '@everise/roulette/data-access';
import { RouletteComponent } from './roulette.component';

describe('RouletteComponent', () => {
  let fixture: ComponentFixture<RouletteComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    try {
      localStorage.clear();
    } catch {
      // No storage in this environment.
    }

    await TestBed.configureTestingModule({
      imports: [RouletteComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '/api' }],
    }).compileComponents();

    fixture = TestBed.createComponent(RouletteComponent);
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

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
          name: 'Dungeons',
          order: 0,
          icon: 61801,
          duties: [{ id: 1, name: 'Sastasha', level: 15, finder: 'Duty Finder', minimumIL: true, roulettes: [] }],
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
      groups: [{ name: 'PvP', order: 0, duties: [frontline('Seal Rock (Seize)')] }],
    });
    http.expectOne('/api/roulettes').flush({ fetchedAt: null, roulettes: [] });
    http.expectOne('/api/jobs').flush({ fetchedAt: null, jobs: [] });
    await fixture.whenStable();
    expect(store().frontlineMap()).toBe('Seal Rock (Seize)');

    await new Promise((resolve) => setTimeout(resolve, 20));
    http.expectOne('/api/duties').flush({
      fetchedAt: null,
      dayEndsAt: new Date(Date.now() + 86_400_000).toISOString(),
      groups: [{ name: 'PvP', order: 0, duties: [frontline('the Borderland Ruins (Secure)')] }],
    });
    await fixture.whenStable();

    expect(store().frontlineMap()).toBe('the Borderland Ruins (Secure)');
    // In the reader's time zone, so only its shape is known.
    expect(store().frontlineChangesAt()).toMatch(/\d/);
    // Nothing more until the next day.
    await new Promise((resolve) => setTimeout(resolve, 20));
    http.expectNone('/api/duties');
  });

  it('shows the duty types once the lists load, with Commence enabled', async () => {
    await load();

    expect(text()).toContain('Dungeons');
    expect(text()).toContain('Duty Roulettes');
    const commence = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button.commence');
    expect(commence?.disabled).toBe(false);
  });

  it("shows each duty type's icon from the backend", async () => {
    await load();

    const icons = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLImageElement>('.type-icon')].map(
      (img) => img.getAttribute('src'),
    );
    expect(icons).toEqual(['/api/images/61801', '/api/images/61807']);
  });

  it("offers the same job and dealer's choice on the third reel", async () => {
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
