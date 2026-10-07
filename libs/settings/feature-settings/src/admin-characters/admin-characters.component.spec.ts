import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CharacterSettings } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { AdminCharactersComponent } from './admin-characters.component';

const tataru: CharacterSettings = {
  id: 'tataru',
  name: 'Tataru',
  title: 'Receptionist',
  persona: 'You are Tataru.',
  defaultPersona: 'You are Tataru.',
  image: '/api/profile-images/1',
  bio: 'Keeper of the books.',
  edited: { title: false, persona: false },
};
const barnaby: CharacterSettings = {
  id: 'barnaby',
  name: 'Barnaby Bollocksworth',
  title: 'Primal hunter',
  persona: 'You are Barnaby, and you swear.',
  defaultPersona: 'You are Barnaby.',
  image: '/api/waking-sands/characters/barnaby/picture',
  edited: { title: false, persona: true },
};

describe('AdminCharactersComponent', () => {
  async function render() {
    TestBed.configureTestingModule({
      imports: [AdminCharactersComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '' }],
    });
    const fixture = TestBed.createComponent(AdminCharactersComponent);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/admin/characters').flush({ characters: [tataru, barnaby] });
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const tab = (name: string) =>
      [...page.querySelectorAll('[cdtTab]')].find((t) => t.textContent?.trim() === name) as HTMLButtonElement;
    const field = (id: string) => page.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement | null;
    return { fixture, http, page, tab, field };
  }

  it('has a tab per character, the first one open with its picture, title, bio and personality', async () => {
    const { page, tab, field } = await render();

    expect([...page.querySelectorAll('[cdtTab]')].map((t) => t.textContent?.trim())).toEqual(['Tataru', 'Barnaby']);
    expect(tab('Tataru').getAttribute('aria-current')).toBe('true');
    expect((page.querySelector('cdt-avatar img') as HTMLImageElement).alt).toBe("Tataru's picture");
    expect(field('character-title')?.value).toBe('Receptionist');
    expect(field('character-bio')?.value).toBe('Keeper of the books.');
    expect(field('character-persona')?.value).toBe('You are Tataru.');
    expect(field('character-persona')?.labels?.[0].textContent?.trim()).toBe('Personality');
  });

  it('switches to another character, who has no bio, and can restore their original personality', async () => {
    const { fixture, http, page, tab, field } = await render();

    tab('Barnaby').click();
    await fixture.whenStable();

    expect(page.querySelector('h3')?.textContent).toBe('Barnaby Bollocksworth');
    expect(field('character-bio')).toBeNull();
    expect(field('character-persona')?.value).toBe('You are Barnaby, and you swear.');
    const restore = [...page.querySelectorAll('button')].find(
      (b) => b.textContent?.includes('Restore the original'),
    ) as HTMLButtonElement;
    expect(restore.disabled).toBe(false);

    restore.click();
    const request = http.expectOne('/admin/characters/barnaby');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toBe(JSON.stringify({ character: { persona: '' } }));
    request.flush({
      character: { ...barnaby, persona: barnaby.defaultPersona, edited: { title: false, persona: false } },
    });
    await fixture.whenStable();

    expect(field('character-persona')?.value).toBe('You are Barnaby.');
    expect(page.querySelector('.status')?.textContent?.trim()).toBe("Barnaby's original personality is back.");
  });

  it("saves the open character's title, bio and personality", async () => {
    const { fixture, http, page, field } = await render();
    const persona = field('character-persona') as HTMLTextAreaElement;

    persona.value = 'You are Tataru, and you charge for everything.';
    persona.dispatchEvent(new Event('input'));
    (page.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));

    const request = http.expectOne('/admin/characters/tataru');
    expect(JSON.parse(request.request.body)).toEqual({
      character: {
        title: 'Receptionist',
        persona: 'You are Tataru, and you charge for everything.',
        bio: 'Keeper of the books.',
      },
    });
    request.flush({ character: { ...tataru, persona: 'You are Tataru, and you charge for everything.' } });
    await fixture.whenStable();

    expect(page.querySelector('.status')?.textContent?.trim()).toBe("Tataru's changes are saved.");
  });

  it("shows the server's message when something is refused", async () => {
    const { fixture, http, page } = await render();

    (page.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    http
      .expectOne('/admin/characters/tataru')
      .flush({ errors: { body: ['Only an admin can do that.'] } }, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();

    const error = page.querySelector('.error') as HTMLElement;
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent?.trim()).toBe('Only an admin can do that.');
  });
});
