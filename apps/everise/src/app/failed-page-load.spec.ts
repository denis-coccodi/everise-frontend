import { NavigationError } from '@angular/router';
import { isFailedPageLoad, reloadOnFailedPageLoad } from './failed-page-load';

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
  };
}

const failed = (
  url: string,
  message = 'Failed to fetch dynamically imported module: https://everise.dev/chunk-ABC.js',
) => new NavigationError(1, url, new TypeError(message));

describe('reloadOnFailedPageLoad', () => {
  it("knows each browser's words for a page's code that couldn't be fetched", () => {
    expect(isFailedPageLoad(new TypeError('Failed to fetch dynamically imported module: /chunk-A.js'))).toBe(true);
    expect(isFailedPageLoad(new TypeError('error loading dynamically imported module: /chunk-A.js'))).toBe(true);
    expect(isFailedPageLoad(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isFailedPageLoad(new Error('Http failure response'))).toBe(false);
    expect(isFailedPageLoad('Failed to fetch dynamically imported module')).toBe(false);
  });

  it('loads the whole site again at the address clicked', () => {
    const location = { assign: vi.fn() };
    reloadOnFailedPageLoad(failed('/events?dc=light'), location, memoryStorage(), 1_000);
    expect(location.assign).toHaveBeenCalledWith('/events?dc=light');
  });

  it('leaves other navigation errors to the router', () => {
    const location = { assign: vi.fn() };
    reloadOnFailedPageLoad(
      new NavigationError(1, '/events', new Error('Guard failed')),
      location,
      memoryStorage(),
      1_000,
    );
    expect(location.assign).not.toHaveBeenCalled();
  });

  it('reloads an address once, not over and over when it still fails', () => {
    const location = { assign: vi.fn() };
    const storage = memoryStorage();
    reloadOnFailedPageLoad(failed('/events'), location, storage, 1_000);
    reloadOnFailedPageLoad(failed('/events'), location, storage, 5_000);
    reloadOnFailedPageLoad(failed('/venues'), location, storage, 6_000);
    reloadOnFailedPageLoad(failed('/events'), location, storage, 60_000);
    expect(location.assign.mock.calls).toEqual([['/events'], ['/venues'], ['/events']]);
  });

  it('reloads without storage too', () => {
    const location = { assign: vi.fn() };
    reloadOnFailedPageLoad(failed('/events'), location, null, 1_000);
    expect(location.assign).toHaveBeenCalledWith('/events');
  });
});
