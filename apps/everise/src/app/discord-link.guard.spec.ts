import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthStore, discordLinkGuard } from '@everise/auth/data-access';
import { User } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';

@Component({ template: '' })
class PageComponent {}

// The guard on the pages the site links from the Everise Discord.
describe('discordLinkGuard', () => {
  function setup(signedIn: boolean) {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
        provideRouter([
          { path: 'article/:id', canActivate: [discordLinkGuard], component: PageComponent },
          { path: 'login', component: PageComponent },
        ]),
      ],
    });
    if (signedIn) TestBed.inject(AuthStore).confirmed({ id: 'u1', username: 'alisaie' } as User);
    return TestBed.inject(Router);
  }

  afterEach(() => sessionStorage.clear());

  it('asks a signed-out visitor from Discord to sign in, and remembers where they were going', async () => {
    const router = setup(false);

    await router.navigateByUrl('/article/post-1?from=discord');

    expect(router.url).toBe('/login?from=discord');
    expect(sessionStorage.getItem('returnUrl')).toBe('/article/post-1?from=discord');
  });

  it('lets a member through', async () => {
    const router = setup(true);

    await router.navigateByUrl('/article/post-1?from=discord');

    expect(router.url).toBe('/article/post-1?from=discord');
  });

  it('keeps the page open to everyone when not opened from Discord', async () => {
    const router = setup(false);

    await router.navigateByUrl('/article/post-1');

    expect(router.url).toBe('/article/post-1');
    expect(sessionStorage.getItem('returnUrl')).toBeNull();
  });
});
