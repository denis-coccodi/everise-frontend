import type { NavigationError } from '@angular/router';

// Each page's code is fetched the first time it's opened. A tab left open
// through a deploy asks for files that are gone, and on staging an expired
// Access session turns every fetch into its login page: the router can't
// load the page, and a click on a link did nothing. Then the whole site
// loads again at the address clicked, from the new deploy (or through the
// Access login first).
// The browsers' words for a module that couldn't be fetched: Chrome,
// Firefox, Safari.
const FAILED_IMPORT =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;
// Once per address in this long: a page that still can't load says so in
// the console, without reloading over and over.
const AGAIN_AFTER_MS = 30_000;
const LAST_RELOAD_KEY = 'everise.failedPageLoad';

export const isFailedPageLoad = (error: unknown) => error instanceof Error && FAILED_IMPORT.test(error.message);

export function reloadOnFailedPageLoad(
  event: NavigationError,
  location: Pick<Location, 'assign'> = window.location,
  storage: Pick<Storage, 'getItem' | 'setItem'> | null = sessionStorageOrNull(),
  now = Date.now(),
) {
  if (!isFailedPageLoad(event.error)) return;
  const last = read(storage);
  if (last?.url === event.url && now - last.at < AGAIN_AFTER_MS) return;
  try {
    storage?.setItem(LAST_RELOAD_KEY, JSON.stringify({ url: event.url, at: now }));
  } catch {
    // No storage (a private window): reload all the same.
  }
  location.assign(event.url);
}

function read(storage: Pick<Storage, 'getItem'> | null): { url: string; at: number } | null {
  try {
    return JSON.parse(storage?.getItem(LAST_RELOAD_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function sessionStorageOrNull() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
