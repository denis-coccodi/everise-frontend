import { DestroyRef, InjectionToken, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter, interval } from 'rxjs';

// A page that opened this recently hasn't been used yet: a new version can
// replace it at once.
const FRESH_MS = 10 * 1000;
// Open tabs ask for a new version this often (the service worker otherwise
// only asks when a page loads).
const CHECK_MS = 30 * 60 * 1000;

// Loads the page again: the URL given, or this one. Tests pass a fake.
export const PAGE_LOAD = new InjectionToken<(url?: string) => void>('PAGE_LOAD', {
  factory: () => (url) => (url ? window.location.assign(url) : window.location.reload()),
});

// The deployed site works offline through a service worker, which serves
// the app it has cached and fetches a new version in the background. Without
// this, a visitor would see the previous version until they reload (e.g. a
// post opened from a Discord link, without its newest parts). Once the new
// version is ready: a page that has just opened switches at once; one in use
// switches at its next navigation, so nothing being typed is lost.
export function watchAppUpdates() {
  const updates = inject(SwUpdate);
  if (!updates.isEnabled) return;
  const router = inject(Router);
  const load = inject(PAGE_LOAD);
  const destroyRef = inject(DestroyRef);
  const startedAt = Date.now();
  let ready = false;

  updates.versionUpdates
    .pipe(
      filter((event) => event.type === 'VERSION_READY'),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe(() => {
      if (Date.now() - startedAt < FRESH_MS) load();
      else ready = true;
    });

  router.events
    .pipe(
      filter((event): event is NavigationStart => event instanceof NavigationStart),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe((event) => {
      if (ready) load(event.url);
    });

  // A cached version the worker can no longer serve: start afresh.
  updates.unrecoverable.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => load());

  interval(CHECK_MS)
    .pipe(takeUntilDestroyed(destroyRef))
    .subscribe(() => void updates.checkForUpdate().catch(() => undefined));
}
