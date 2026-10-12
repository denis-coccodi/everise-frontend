import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@everise/core/http-client';
import { PostDiscordShareStore } from './post-discord-share.store';

describe('PostDiscordShareStore', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
        PostDiscordShareStore,
      ],
    });
    return { store: TestBed.inject(PostDiscordShareStore), http: TestBed.inject(HttpTestingController) };
  }

  it('shares the post, saying when it is sending and when it is sent', () => {
    const { store, http } = setup();

    store.share('post-1');
    expect(store.status()).toBe('sending');
    const request = http.expectOne('/api/articles/post-1/discord');
    expect(request.request.method).toBe('POST');
    request.flush({ shared: true }, { status: 202, statusText: 'Accepted' });

    expect(store.status()).toBe('shared');
    expect(store.error()).toBeNull();
    http.verify();
  });

  it("says why when it can't, in the backend's words", () => {
    const { store, http } = setup();

    store.share('post-1');
    http
      .expectOne('/api/articles/post-1/discord')
      .flush(
        { errors: { body: ['You can share another post in 42 seconds.'] } },
        { status: 429, statusText: 'Too Many Requests' },
      );

    expect(store.status()).toBe('error');
    expect(store.error()).toBe('You can share another post in 42 seconds.');
  });
});
