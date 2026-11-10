import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_URL } from '@everise/core/http-client';
import { PartyFinderStore } from '@everise/party-finder/data-access';
import { PfDataCentresComponent } from './pf-data-centres.component';

// The page's store, as the Party Finder page provides it.
@Component({
  imports: [PfDataCentresComponent],
  providers: [PartyFinderStore],
  template: '<cdt-pf-data-centres />',
})
class HostComponent {}

describe('PfDataCentresComponent', () => {
  it("links to every region with its listings up, keeping the member's other choices, the current one marked", async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
        provideRouter([{ path: 'party-finder', component: HostComponent }]),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/party-finder?dc=chaos&slot=healer');
    TestBed.inject(HttpTestingController)
      .expectOne('/party-finder?dataCentre=Chaos')
      .flush({
        dataCentre: 'Chaos',
        dataCentres: ['Light', 'Chaos'],
        worlds: [],
        regions: [
          { name: 'Europe', dataCentres: ['Light', 'Chaos'] },
          { name: 'Oceania', dataCentres: ['Materia'] },
        ],
        fetchedAt: null,
        icons: null,
        listings: [],
        counts: [
          { dataCentre: 'Light', listings: 3 },
          { dataCentre: 'Chaos', listings: 2 },
          { dataCentre: 'Materia', listings: 4 },
        ],
      });
    await harness.fixture.whenStable();
    const page = harness.fixture.nativeElement as HTMLElement;

    const links = [...page.querySelectorAll('a')];
    // Light and Chaos are one: the one shown counts its list (none here).
    expect(links.map((a) => a.textContent?.trim())).toEqual(['Europe (0)', 'Oceania (4)']);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/party-finder?dc=chaos&slot=healer',
      '/party-finder?dc=materia&slot=healer',
    ]);
    expect(links.map((a) => a.getAttribute('aria-current'))).toEqual(['page', null]);
  });
});
