import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import { SandsEvent, SandsLine, SandsRoom } from '@everise/core/api-types';

// The backend's limits, as GET /api/waking-sands/room sends them.
const limits = { maxPresent: 3, maxLineLength: 1000 };
import { API_URL, LiveUpdates } from '@everise/core/http-client';
import { Subject } from 'rxjs';
import { WakingSandsComponent } from './waking-sands.component';

const TATARU = { id: 'tataru', name: 'Tataru', title: 'Receptionist', image: '/tataru.png' };
const BARNABY = { id: 'barnaby', name: 'Barnaby Bollocksworth', title: 'Braggart', image: '/barnaby.png' };
const URIANGER = { id: 'urianger', name: 'Urianger', title: 'Astrologian', image: '/urianger.png' };
const YSHTOLA = { id: 'yshtola', name: "Y'shtola", title: 'Sorceress', image: '/yshtola.png' };

const line = (id: string, from: string, name: string, text: string, extra: Partial<SandsLine> = {}): SandsLine => ({
  id,
  at: `2026-10-06T12:00:0${id}Z`,
  from,
  name,
  text,
  ...extra,
});

describe('WakingSandsComponent', () => {
  let fixture: ComponentFixture<WakingSandsComponent>;
  let http: HttpTestingController;
  let page: HTMLElement;
  let live: Subject<SandsEvent>;
  let opened: Subject<void>;

  async function render({
    loggedIn = true,
    available = true,
    present = [] as string[],
    lines = [] as SandsLine[],
    characters = [TATARU, BARNABY],
  } = {}) {
    live = new Subject<SandsEvent>();
    opened = new Subject<void>();
    TestBed.configureTestingModule({
      imports: [WakingSandsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '/api' },
        { provide: LiveUpdates, useValue: { sands$: live, opened$: opened } },
        {
          provide: AuthStore,
          useValue: {
            loggedIn: signal(loggedIn),
            user: signal({ id: 'm1', username: 'Minfilia', image: '/minfilia.png', email: 'm@example.com', bio: '' }),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(WakingSandsComponent);
    http = TestBed.inject(HttpTestingController);
    page = fixture.nativeElement as HTMLElement;
    http
      .expectOne('/api/waking-sands/room')
      .flush({ available, characters, present, lines, limits } satisfies SandsRoom);
    await fixture.whenStable();
  }

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  // The button named exactly so, or else the first whose name starts so.
  function button(name: string) {
    const buttons = [...page.querySelectorAll('button')];
    return (buttons.find((b) => text(b) === name) ??
      buttons.find((b) => text(b).startsWith(name))) as HTMLButtonElement;
  }

  async function type(value: string) {
    const textarea = page.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = value;
    textarea.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  const script = () =>
    [...page.querySelectorAll('.log > *')].map((el) =>
      el.classList.contains('note')
        ? `(${text(el)})`
        : `${text(el.querySelector('.speaker'))}: ${text(el.querySelector('p'))}`,
    );

  afterEach(() => http.verify());

  it("shows the room: the characters, who's in, and the day's lines, yours on the right", async () => {
    await render({
      present: ['tataru'],
      lines: [
        line('1', 'note', '', 'Thancred invited Tataru in.'),
        line('2', 'member', 'Thancred', 'Morning!', { memberId: 'm2' }),
        line('3', 'tataru', 'Tataru', 'Good morning!', { image: '/tataru.png' }),
        line('4', 'member', 'Minfilia', 'Hello all.', { memberId: 'm1', image: '/minfilia.png' }),
      ],
    });

    expect(text(page.querySelector('h1'))).toBe('The Waking Sands');
    expect(script()).toEqual([
      '(Thancred invited Tataru in.)',
      'Thancred: Morning!',
      'Tataru: Good morning!',
      'Minfilia: Hello all.',
    ]);
    const lines = page.querySelectorAll('.line');
    expect(lines[2].classList).toContain('mine');
    expect(lines[0].classList).not.toContain('mine');
    expect(lines[0].querySelector('img')?.getAttribute('src')).toBe('/assets/images/avatar-profile.png');
    expect(text(button('Send out'))).toBe('Send out Tataru');
    expect(text(button('Invite'))).toBe('Invite Barnaby Bollocksworth');
  });

  it('brings a character in for everyone', async () => {
    await render();

    button('Invite Barnaby').click();
    const request = http.expectOne('/api/waking-sands/room/characters/barnaby');
    expect(request.request.method).toBe('POST');
    request.flush({ present: ['barnaby'] });
    await fixture.whenStable();

    expect(text(button('Send out'))).toBe('Send out Barnaby Bollocksworth');
  });

  it("follows the room live: new lines, who's in, who's writing", async () => {
    await render();

    live.next({ type: 'sands-presence', present: ['tataru'] });
    live.next({ type: 'sands-line', line: line('1', 'member', 'Thancred', 'Anyone in?', { memberId: 'm2' }) });
    live.next({ type: 'sands-writing', character: 'tataru' });
    await fixture.whenStable();

    expect(script()).toEqual(['Thancred: Anyone in?']);
    expect(text(page.querySelector('.status'))).toBe('Tataru is writing…');
    expect(text(button('Send out'))).toBe('Send out Tataru');

    live.next({ type: 'sands-line', line: line('2', 'tataru', 'Tataru', 'Welcome!') });
    live.next({ type: 'sands-writing', character: null });
    // The same line twice (live, then loaded) shows once.
    live.next({ type: 'sands-line', line: line('2', 'tataru', 'Tataru', 'Welcome!') });
    await fixture.whenStable();

    expect(script()).toEqual(['Thancred: Anyone in?', 'Tataru: Welcome!']);
    expect(text(page.querySelector('.status'))).toBe('');
  });

  it('says something, then reloads the room for anything the live updates missed', async () => {
    await render({ present: ['tataru'] });
    await type('Hello, Tataru!');

    button('Send').click();
    const request = http.expectOne('/api/waking-sands/room/lines');
    expect(request.request.body).toBe(JSON.stringify({ text: 'Hello, Tataru!' }));
    await fixture.whenStable();
    expect(text(button('Sending'))).toBe('Sending…');

    const mine = line('1', 'member', 'Minfilia', 'Hello, Tataru!', { memberId: 'm1' });
    request.flush({ line: mine });
    http.expectOne('/api/waking-sands/room').flush({
      available: true,
      characters: [TATARU, BARNABY],
      present: ['tataru'],
      lines: [mine, line('2', 'tataru', 'Tataru', 'Oh! Hello!')],
      limits,
    } satisfies SandsRoom);
    await fixture.whenStable();

    expect(script()).toEqual(['Minfilia: Hello, Tataru!', 'Tataru: Oh! Hello!']);
    expect((page.querySelector('textarea') as HTMLTextAreaElement).value).toBe('');
  });

  it('reloads the room when the live connection (re)opens, for what it missed', async () => {
    await render();

    opened.next();
    http.expectOne('/api/waking-sands/room').flush({
      available: true,
      characters: [TATARU, BARNABY],
      present: ['tataru'],
      lines: [line('1', 'note', '', 'Thancred invited Tataru in.')],
      limits,
    } satisfies SandsRoom);
    await fixture.whenStable();

    expect(script()).toEqual(['(Thancred invited Tataru in.)']);
    expect(text(button('Send out'))).toBe('Send out Tataru');
  });

  it("shows the backend's message when the day's limit is reached", async () => {
    await render();
    await type('Hello?');
    button('Send').click();

    http
      .expectOne('/api/waking-sands/room/lines')
      .flush(
        { errors: { body: ['The Waking Sands is closed for the rest of the day.'] } },
        { status: 429, statusText: 'Too Many Requests' },
      );
    await fixture.whenStable();

    expect(text(page.querySelector('[role=alert]'))).toContain('closed for the rest of the day');
  });

  it('lets guests watch, and asks them to sign in to talk', async () => {
    await render({ loggedIn: false, present: ['tataru'] });

    expect(page.querySelector('textarea')).toBeNull();
    expect(button('Invite')).toBeUndefined();
    expect(button('Send out')).toBeUndefined();
    expect(text(page.querySelector('.sign-in'))).toContain('to join the conversation');
  });

  it('offers no invitations while three characters are in, and says why', async () => {
    await render({ characters: [TATARU, URIANGER, YSHTOLA, BARNABY], present: ['tataru', 'urianger', 'yshtola'] });

    expect(button('Invite')).toBeUndefined();
    expect(text(page.querySelector('.hint'))).toContain('The room is full');

    live.next({ type: 'sands-presence', present: ['tataru', 'yshtola'] });
    await fixture.whenStable();

    expect([...page.querySelectorAll('.cast button')].map((b) => text(b))).toEqual([
      'Send out Tataru',
      'Invite Urianger',
      "Send out Y'shtola",
      'Invite Barnaby Bollocksworth',
    ]);
  });

  it("says when the room isn't open", async () => {
    await render({ available: false });

    expect(text(page.querySelector('.notice'))).toContain("isn't open yet");
  });
});
