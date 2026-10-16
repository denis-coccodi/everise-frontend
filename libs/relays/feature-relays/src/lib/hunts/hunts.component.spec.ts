import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HuntsResponse } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { HuntsComponent } from './hunts.component';

describe('HuntsComponent', () => {
  async function render(hunts: HuntsResponse) {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '/api' }],
    });
    const fixture = TestBed.createComponent(HuntsComponent);
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('/api/hunts').flush(hunts);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows a window per data centre, Light first, each train with where it is at', async () => {
    const soon = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const page = await render({
      available: true,
      dataCentres: ['Light', 'Chaos'],
      posts: [
        {
          dataCentre: 'Light',
          startsAt: soon,
          message: {
            id: '1',
            postedAt: new Date().toISOString(),
            sourceName: 'Centurio Hunts (FFXIV) #light-train-relay',
            content: '@EWTrain **[Odin]** Hunt train starting soon',
            embeds: [],
            attachments: [],
          },
        },
      ],
    });

    const windows = [...page.querySelectorAll('cdt-panel')];
    expect(windows.map((w) => w.querySelector('h2')?.textContent)).toEqual(['Light', 'Chaos']);
    expect(windows[0].querySelector('.state')?.textContent).toMatch(/^Starts in 10 minutes$/);
    expect(windows[0].querySelector('.state')?.getAttribute('data-state')).toBe('upcoming');
    expect(windows[0].querySelector('cdt-discord-message strong')?.textContent).toBe('[Odin]');
    expect(windows[1].textContent).toContain('No hunt trains announced on Chaos right now.');
  });

  it("says so when the trains aren't relayed", async () => {
    const page = await render({ available: false, dataCentres: [], posts: [] });
    expect(page.textContent).toContain("The hunt trains aren't relayed here yet.");
  });
});
