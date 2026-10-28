import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_URL } from '@everise/core/http-client';
import { ProfileStore } from '@everise/profile/data-access';
import { ProfileComponent } from './profile.component';

describe('ProfileComponent', () => {
  it('names the member by their character and world, on the heading and the Follow button', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    const fixture = TestBed.createComponent(ProfileComponent);
    TestBed.inject(ProfileStore).getProfile('u-avar');
    TestBed.inject(HttpTestingController)
      .expectOne('/api/profiles/u-avar')
      .flush({
        profile: {
          id: 'u-avar',
          username: 'avar',
          characterName: 'Avar Kriss',
          server: 'Odin',
          displayName: 'Avar Kriss (Odin)',
          following: false,
          bio: null,
          image: '/avar.png',
        },
      });
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Avar Kriss (Odin)');
    expect(page.querySelector('.profile-ctas button')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Follow Avar Kriss (Odin)',
    );
  });
});
