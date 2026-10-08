import { ApplicationInitStatus, Component, provideAppInitializer } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { PAGE_LOAD, watchAppUpdates } from './app-updates';

@Component({ template: '' })
class PageComponent {}

describe('watchAppUpdates', () => {
  async function setup(isEnabled = true) {
    vi.useFakeTimers({ toFake: ['Date'] });
    const versionUpdates = new Subject<VersionEvent>();
    const loads: (string | undefined)[] = [];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: PageComponent },
          { path: 'party-finder', component: PageComponent },
        ]),
        {
          provide: SwUpdate,
          useValue: { isEnabled, versionUpdates, unrecoverable: new Subject(), checkForUpdate: async () => false },
        },
        { provide: PAGE_LOAD, useValue: (url?: string) => loads.push(url) },
        provideAppInitializer(watchAppUpdates),
      ],
    });
    await TestBed.inject(ApplicationInitStatus).donePromise;
    const ready = () =>
      versionUpdates.next({
        type: 'VERSION_READY',
        currentVersion: { hash: 'old' },
        latestVersion: { hash: 'new' },
      });
    return { router: TestBed.inject(Router), ready, loads };
  }

  afterEach(() => vi.useRealTimers());

  it('switches a page that has just opened to the new version at once', async () => {
    const { ready, loads } = await setup();

    ready();

    expect(loads).toEqual([undefined]);
  });

  it('waits for the next navigation on a page in use, and loads that page in the new version', async () => {
    const { router, ready, loads } = await setup();
    vi.setSystemTime(Date.now() + 60_000);

    ready();
    expect(loads).toEqual([]);

    await router.navigateByUrl('/party-finder');
    expect(loads).toEqual(['/party-finder']);
  });

  it('does nothing without the service worker (local development)', async () => {
    const { router, loads } = await setup(false);

    await router.navigateByUrl('/party-finder');

    expect(loads).toEqual([]);
  });
});
