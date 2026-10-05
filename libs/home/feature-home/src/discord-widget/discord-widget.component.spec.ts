import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@realworld/core/http-client';
import { EVERISE_DISCORD } from '@realworld/ui/components';
import { DiscordWidgetComponent } from './discord-widget.component';

describe('DiscordWidgetComponent', () => {
  async function render(answer: object | 'error') {
    TestBed.configureTestingModule({
      imports: [DiscordWidgetComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '' }],
    });
    const fixture = TestBed.createComponent(DiscordWidgetComponent);
    const request = TestBed.inject(HttpTestingController).expectOne('/discord/widget');
    if (answer === 'error') request.flush(null, { status: 502, statusText: 'Bad Gateway' });
    else request.flush(answer);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it("shows who's online, with their status in words, and a way in", async () => {
    const page = await render({
      widget: {
        name: 'EVERISE',
        presenceCount: 6,
        members: [
          { name: 'Tataru', avatarUrl: 'https://cdn/t.png', status: 'online' },
          { name: 'Alphinaud', avatarUrl: 'https://cdn/a.png', status: 'dnd' },
        ],
      },
    });

    expect(page.querySelector('h2')?.textContent?.trim()).toBe('On Discord');
    expect(page.querySelector('.online')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('6 members online now');
    expect([...page.querySelectorAll('.member')].map((m) => m.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Tataru, online',
      'Alphinaud, do not disturb',
    ]);
    const join = page.querySelector('a.join') as HTMLAnchorElement;
    expect(join.getAttribute('href')).toBe(EVERISE_DISCORD);
    expect(join.target).toBe('_blank');
  });

  it("shows nothing when the server's widget is off or can't be read", async () => {
    expect((await render({ widget: null })).textContent?.trim()).toBe('');
    TestBed.resetTestingModule();
    expect((await render('error')).textContent?.trim()).toBe('');
  });
});
