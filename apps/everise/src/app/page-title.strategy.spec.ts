import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { PageTitleStrategy } from './page-title.strategy';

@Component({ template: '' })
class PageComponent {}

describe('PageTitleStrategy', () => {
  it('names each page, then the site, and the site alone for a page without a title', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', title: 'Sign in', component: PageComponent },
          {
            path: 'profile/:username',
            title: (route) => `${route.paramMap.get('username')}'s articles`,
            component: PageComponent,
          },
          { path: 'untitled', component: PageComponent },
        ]),
        { provide: TitleStrategy, useClass: PageTitleStrategy },
      ],
    });
    const router = TestBed.inject(Router);
    const title = TestBed.inject(Title);

    await router.navigateByUrl('/login');
    expect(title.getTitle()).toBe('Sign in · Everise');
    await router.navigateByUrl('/profile/Thancred');
    expect(title.getTitle()).toBe("Thancred's articles · Everise");
    await router.navigateByUrl('/untitled');
    expect(title.getTitle()).toBe('Everise');
  });
});
