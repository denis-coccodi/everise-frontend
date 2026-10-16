import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { WeeklyResponse } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { WeeklyComponent } from './weekly.component';

const HOUR = 60 * 60 * 1000;

describe('WeeklyComponent', () => {
  async function render(weekly: WeeklyResponse) {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '/api' }],
    });
    const fixture = TestBed.createComponent(WeeklyComponent);
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('/api/weekly').flush(weekly);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const at = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString();

  it("shows the resets, and this week's Fashion Report while judging is open", async () => {
    const page = await render({
      available: true,
      resets: { daily: at(3.5), weekly: at(100), grandCompany: at(8) },
      fashionReport: {
        message: {
          id: '1',
          postedAt: at(-2),
          sourceName: 'Fashion Reporter #fashion-report-infographics',
          content: '',
          embeds: [{ type: 'rich', title: 'Fashion Report Week 454 - Full Details', fields: [] }],
          attachments: [],
        },
        validFrom: at(-5),
        validUntil: at(50),
      },
      nextJudgingAt: at(150),
      islandSanctuary: null,
    });

    const windows = [...page.querySelectorAll('cdt-panel')];
    expect(windows.map((w) => w.querySelector('h2')?.textContent)).toEqual([
      'Resets',
      'Fashion Report',
      'Island Sanctuary',
    ]);
    expect(windows[0].querySelector('li .in')?.textContent).toMatch(/^in 3 h (29|30) min$/);
    expect(windows[1].querySelector('.status')?.textContent).toMatch(/^Judging is open until .* left\)\.$/);
    expect(windows[1].querySelector('cdt-discord-embed .title')?.textContent).toContain('Week 454');
    expect(windows[1].querySelector('.credit')?.textContent).toContain('Fashion Reporter');
    expect(windows[2].querySelector('.status')?.textContent).toContain("aren't posted yet");
  });
});
