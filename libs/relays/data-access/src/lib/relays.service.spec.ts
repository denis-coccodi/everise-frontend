import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@everise/core/http-client';
import { RelaysService } from './relays.service';

describe('RelaysService', () => {
  it('asks for the week, and for the hunt trains of all data centres or one', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '/api' }],
    });
    const service = TestBed.inject(RelaysService);
    const http = TestBed.inject(HttpTestingController);

    service.weekly().subscribe();
    service.hunts().subscribe();
    service.hunts('Chaos').subscribe();

    http.expectOne('/api/weekly');
    http.expectOne('/api/hunts');
    http.expectOne('/api/hunts?dataCentre=Chaos');
    http.verify();
  });
});
