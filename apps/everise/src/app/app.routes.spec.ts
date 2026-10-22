import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { API_URL } from '@everise/core/http-client';
import { APP_ROUTES } from './app.routes';
import { PageTitleStrategy } from './page-title.strategy';

// Each feature's pages come from its library's routes: every address still
// opens its page, with its title.
describe('APP_ROUTES', () => {
  async function open(url: string) {
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    return { url: router.url, title: TestBed.inject(Title).getTitle() };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
        provideRouter(APP_ROUTES),
        { provide: TitleStrategy, useClass: PageTitleStrategy },
      ],
    });
  });

  it.each([
    ['/', 'Home · Everise'],
    ['/login', 'Sign in · Everise'],
    ['/privacy', 'Privacy policy · Everise'],
    ['/roulette', 'Duty Roulette · Everise'],
    ['/waking-sands', 'The Waking Sands · Everise'],
    ['/party-finder?dc=light', 'Light Party Finder · Everise'],
    ['/party-finder/listings/42', 'Party Finder listing · Everise'],
    ['/venues', 'Venues · Everise'],
    ['/events?dc=chaos', 'Chaos Events · Everise'],
    ['/events/7', 'Event · Everise'],
    ['/market-history', 'Market History · Everise'],
    ['/planner', 'Fight Planner · Everise'],
  ])('opens %s as "%s"', async (url, title) => {
    expect(await open(url)).toEqual({ url, title });
  });

  it('sends the old home address and unknown ones to the home page', async () => {
    expect((await open('/home')).url).toBe('/');
    expect((await open('/no-such-page')).url).toBe('/');
  });
});
