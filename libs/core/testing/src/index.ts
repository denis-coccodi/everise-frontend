// The test setup every project's src/test-setup.ts loads: Angular's test
// environment, zoneless like the app, and strict about templates. An
// unknown element or property (a component missing from a component's
// imports) fails the test instead of only logging a warning. Angular reads
// those options when the environment starts, not per test module, so they
// can't be set from a spec.
import '@angular/compiler';
import '@analogjs/vitest-angular/setup-snapshots';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
import { NgModule, provideZonelessChangeDetection } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

@NgModule({ providers: [provideZonelessChangeDetection()] })
class ZonelessTestingModule {}

// Analog's setup registers the cleanup between tests; the environment is
// then started again with the strict options.
setupTestBed();
getTestBed().resetTestEnvironment();
getTestBed().initTestEnvironment([BrowserTestingModule, ZonelessTestingModule], platformBrowserTesting(), {
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
  teardown: { destroyAfterEach: true },
});
