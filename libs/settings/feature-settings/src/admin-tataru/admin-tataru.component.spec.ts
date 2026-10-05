import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@realworld/core/http-client';
import { AdminTataruComponent } from './admin-tataru.component';

const tataru = { username: 'Tataru', bio: 'Keeper of the books.', image: '/api/profile-images/1' };

describe('AdminTataruComponent', () => {
  async function render() {
    TestBed.configureTestingModule({
      imports: [AdminTataruComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '' }],
    });
    const fixture = TestBed.createComponent(AdminTataruComponent);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/admin/tataru').flush({ tataru });
    await fixture.whenStable();
    return { fixture, http, page: fixture.nativeElement as HTMLElement };
  }

  it('shows her picture and her bio in a labelled field', async () => {
    const { page } = await render();

    const picture = page.querySelector('.avatar') as HTMLImageElement;
    expect(picture.getAttribute('src')).toBe(tataru.image);
    expect(picture.alt).toBe("Tataru's picture");
    const bio = page.querySelector('#tataru-bio') as HTMLTextAreaElement;
    expect(bio.value).toBe('Keeper of the books.');
    expect(bio.labels?.[0].textContent?.trim()).toBe('Her bio');
  });

  it('saves her bio and says so', async () => {
    const { fixture, http, page } = await render();
    const bio = page.querySelector('#tataru-bio') as HTMLTextAreaElement;

    bio.value = 'Gil first.';
    bio.dispatchEvent(new Event('input'));
    (page.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    const request = http.expectOne('/admin/tataru');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toBe(JSON.stringify({ tataru: { bio: 'Gil first.' } }));
    request.flush({ tataru: { ...tataru, bio: 'Gil first.' } });
    await fixture.whenStable();

    expect(page.querySelector('.status')?.textContent?.trim()).toBe('Her bio is saved.');
  });

  it("shows the server's message when something is refused", async () => {
    const { fixture, http, page } = await render();

    (page.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    http
      .expectOne('/admin/tataru')
      .flush({ errors: { body: ['Only an admin can do that.'] } }, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();

    const error = page.querySelector('.error') as HTMLElement;
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent?.trim()).toBe('Only an admin can do that.');
  });
});
