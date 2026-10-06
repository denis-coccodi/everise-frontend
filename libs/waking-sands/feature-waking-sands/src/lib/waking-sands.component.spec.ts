import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '@realworld/auth/data-access';
import { API_URL } from '@realworld/core/http-client';
import { WakingSandsComponent } from './waking-sands.component';

const TATARU = {
  id: 'tataru',
  name: 'Tataru',
  title: 'Receptionist of the Scions of the Seventh Dawn',
  image: '/tataru.png',
};
const URIANGER = { id: 'urianger', name: 'Urianger', title: 'Astrologian', image: '/urianger.png' };
const YSHTOLA = { id: 'yshtola', name: "Y'shtola", title: 'Sorceress', image: '/yshtola.png' };

describe('WakingSandsComponent', () => {
  let fixture: ComponentFixture<WakingSandsComponent>;
  let http: HttpTestingController;
  let page: HTMLElement;

  async function render(loggedIn = true, available = true, characters = [TATARU]) {
    try {
      sessionStorage.clear();
    } catch {
      // No storage in this environment.
    }
    TestBed.configureTestingModule({
      imports: [WakingSandsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '/api' },
        {
          provide: AuthStore,
          useValue: {
            loggedIn: signal(loggedIn),
            user: signal({ username: 'Minfilia', image: '/minfilia.png', email: 'm@example.com', bio: '' }),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(WakingSandsComponent);
    http = TestBed.inject(HttpTestingController);
    page = fixture.nativeElement as HTMLElement;
    http.expectOne('/api/waking-sands/characters').flush({ available, characters });
    await fixture.whenStable();
  }

  function button(name: string) {
    return [...page.querySelectorAll('button')].find(
      (b) => b.textContent?.replace(/\s+/g, ' ').trim().startsWith(name),
    );
  }

  async function type(text: string) {
    const textarea = page.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = text;
    textarea.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function click(name: string) {
    button(name)!.click();
    await fixture.whenStable();
  }

  afterEach(() => http.verify());

  it('lists Tataru with a button to invite her, named for her', async () => {
    await render();

    expect(page.querySelector('h1')?.textContent).toContain('The Waking Sands');
    expect(page.querySelector('.person .name')?.textContent).toBe('Tataru');
    expect(button('Invite')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Invite Tataru');
  });

  it("can't send until someone is invited and something is written", async () => {
    await render();
    const send = () => button('Send') as HTMLButtonElement;

    expect(send().disabled).toBe(true);
    await type('Hello!');
    expect(send().disabled).toBe(true);
    await click('Invite');
    expect(send().disabled).toBe(false);
    expect(page.querySelector('.log')?.textContent).toContain('Tataru joins the conversation.');
  });

  it('sends the conversation and shows her answer', async () => {
    await render();
    await click('Invite');
    await type('Hello, Tataru!');

    await click('Send');

    const request = http.expectOne('/api/waking-sands/replies');
    expect(request.request.body).toEqual(
      JSON.stringify({ characters: ['tataru'], lines: [{ from: 'member', text: 'Hello, Tataru!' }] }),
    );
    expect(page.querySelector('.status')?.textContent).toContain('Tataru is writing…');
    expect((page.querySelector('textarea') as HTMLTextAreaElement).value).toBe('');

    request.flush({ replies: [{ character: 'tataru', text: 'Oh! Welcome!' }] });
    await fixture.whenStable();

    const lines = [...page.querySelectorAll('.line')].map(
      (line) => `${line.querySelector('.speaker')?.textContent}: ${line.querySelector('p')?.textContent}`,
    );
    expect(lines).toEqual(['Minfilia: Hello, Tataru!', 'Tataru: Oh! Welcome!']);
    expect(page.querySelector('.status')?.textContent?.trim()).toBe('');
  });

  it("shows the backend's message when the day's limit is reached", async () => {
    await render();
    await click('Invite');
    await type('Hello?');
    await click('Send');

    http
      .expectOne('/api/waking-sands/replies')
      .flush(
        { errors: { body: ['The Waking Sands is closed for the rest of the day.'] } },
        { status: 429, statusText: 'Too Many Requests' },
      );
    await fixture.whenStable();

    expect(page.querySelector('[role=alert]')?.textContent).toContain('closed for the rest of the day');
  });

  it('starts over with an empty room', async () => {
    await render();
    await click('Invite');

    await click('Start over');

    expect(page.querySelector('.log')?.textContent).toContain('The room is quiet.');
  });

  it('asks guests to sign in to talk', async () => {
    await render(false);

    expect(page.querySelector('textarea')).toBeNull();
    expect(page.querySelector('.sign-in')?.textContent).toContain('to join the conversation');
  });

  it('lets everyone invited answer, in the order they joined', async () => {
    await render(true, true, [TATARU, URIANGER, YSHTOLA]);
    for (const name of ["Y'shtola", 'Tataru', 'Urianger']) {
      await click(`Invite ${name}`);
    }
    await type('Hello, everyone!');

    await click('Send');

    const request = http.expectOne('/api/waking-sands/replies');
    expect(JSON.parse(request.request.body).characters).toEqual(['yshtola', 'tataru', 'urianger']);
    expect(page.querySelector('.status')?.textContent).toContain("Y'shtola, Tataru and Urianger are writing…");
    request.flush({
      replies: [
        { character: 'yshtola', text: 'Hello.' },
        { character: 'tataru', text: 'Welcome!' },
        { character: 'urianger', text: 'Well met.' },
      ],
    });
    await fixture.whenStable();

    expect([...page.querySelectorAll('.line:not(.mine) .speaker')].map((s) => s.textContent)).toEqual([
      "Y'shtola",
      'Tataru',
      'Urianger',
    ]);
  });

  it('keeps your name and picture on your lines after signing out and reloading', async () => {
    await render();
    await click('Invite');
    await type('Hello!');
    await click('Send');
    http.expectOne('/api/waking-sands/replies').flush({ replies: [{ character: 'tataru', text: 'Hi!' }] });
    await fixture.whenStable();

    // Signed out: the store forgets the user; the page is opened again.
    const authStore = TestBed.inject(AuthStore) as unknown as {
      loggedIn: ReturnType<typeof signal<boolean>>;
      user: ReturnType<typeof signal<{ username: string; image: string }>>;
    };
    authStore.loggedIn.set(false);
    authStore.user.set({ username: '', image: '' });
    fixture.destroy();
    fixture = TestBed.createComponent(WakingSandsComponent);
    page = fixture.nativeElement as HTMLElement;
    http.expectOne('/api/waking-sands/characters').flush({ available: true, characters: [TATARU] });
    await fixture.whenStable();

    const mine = page.querySelector('.line.mine') as HTMLElement;
    expect(mine.querySelector('.speaker')?.textContent).toBe('Minfilia');
    expect(mine.querySelector('img')?.getAttribute('src')).toBe('/minfilia.png');
  });

  it("says when the chat isn't open", async () => {
    await render(true, false);

    expect(page.querySelector('.notice')?.textContent).toContain("isn't open yet");
  });
});
