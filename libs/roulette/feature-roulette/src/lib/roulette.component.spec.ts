import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '@realworld/core/http-client';
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

  function text() {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('shows the duty types once the lists load, with Commence enabled', async () => {
    http.expectOne('/api/duties').flush({
      fetchedAt: '2026-10-04T00:00:00Z',
      groups: [
        {
          name: 'Dungeons',
          order: 0,
          duties: [{ id: 1, name: 'Sastasha', level: 15, minimumIL: true, roulettes: [] }],
        },
      ],
    });
    http.expectOne('/api/roulettes').flush({
      fetchedAt: '2026-10-04T00:00:00Z',
      roulettes: [{ id: 1, name: 'Duty Roulette: Leveling', level: 16, joinPartyInProgress: true }],
    });
    await fixture.whenStable();

    expect(text()).toContain('Dungeons');
    expect(text()).toContain('Duty Roulettes');
    const commence = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button.commence');
    expect(commence?.disabled).toBe(false);
  });

  it('explains when the lists have not been downloaded yet', async () => {
    http.expectOne('/api/duties').flush({ fetchedAt: null, groups: [] });
    http.expectOne('/api/roulettes').flush({ fetchedAt: null, roulettes: [] });
    await fixture.whenStable();

    expect(text()).toContain("hasn't been downloaded yet");
  });

  afterEach(() => http.verify());
});
