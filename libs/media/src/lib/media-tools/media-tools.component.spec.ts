import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '@realworld/core/http-client';
import { MediaToolsComponent } from './media-tools.component';

@Component({
  template: `<textarea id="text"></textarea><cdt-media-tools for="text" />`,
  imports: [MediaToolsComponent],
})
class HostComponent {}

describe('MediaToolsComponent', () => {
  async function render(text: string, cursor: number) {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '/api' }],
    });
    const fixture = TestBed.createComponent(HostComponent);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const area = page.querySelector('textarea') as HTMLTextAreaElement;
    area.value = text;
    area.setSelectionRange(cursor, cursor);
    const typed: string[] = [];
    area.addEventListener('input', () => typed.push(area.value));
    const http = TestBed.inject(HttpTestingController);
    return { fixture, page, area, typed, http };
  }

  const button = (page: HTMLElement, text: string) =>
    [...page.querySelectorAll('button')].find((b) => b.textContent?.trim() === text) as HTMLButtonElement;

  const type = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  afterEach(() => document.body.replaceChildren());

  it('puts a YouTube video on its own line at the cursor, as if typed', async () => {
    const { fixture, page, area, typed } = await render('Before after', 6);

    button(page, 'YouTube video').click();
    await fixture.whenStable();
    expect(document.activeElement?.id).toBe('youtube-link');
    type(page.querySelector('#youtube-link') as HTMLInputElement, 'https://youtu.be/dQw4w9WgXcQ');
    await fixture.whenStable();
    button(page, 'Add video').click();
    await fixture.whenStable();

    expect(area.value).toBe('Before\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ\n after');
    expect(typed).toEqual([area.value]);
    expect(page.querySelector('[role=dialog]')).toBeNull();
    expect(document.activeElement).toBe(area);
  });

  it('turns down a link that is not a YouTube video', async () => {
    const { fixture, page } = await render('', 0);

    button(page, 'YouTube video').click();
    await fixture.whenStable();
    type(page.querySelector('#youtube-link') as HTMLInputElement, 'https://example.com/video');
    await fixture.whenStable();

    expect(button(page, 'Add video').disabled).toBe(true);
    expect(page.querySelector('[role=status]')?.textContent).toContain("isn't a YouTube video link");
  });

  it('links an image with its description', async () => {
    const { fixture, page, area, http } = await render('', 0);

    button(page, 'Image or GIF').click();
    await fixture.whenStable();
    http.expectOne('/api/gifs/available').flush({ available: false });
    await fixture.whenStable();
    expect([...page.querySelectorAll('[cdtTab]')].map((t) => t.textContent?.trim())).toEqual(['Upload', 'Link']);

    button(page, 'Link').click();
    await fixture.whenStable();
    type(page.querySelector('#media-link') as HTMLInputElement, 'https://example.com/cat.gif');
    type(page.querySelector('#media-description') as HTMLInputElement, 'A cat');
    await fixture.whenStable();
    button(page, 'Add image').click();
    await fixture.whenStable();

    expect(area.value).toBe('![A cat](https://example.com/cat.gif)\n');
  });

  it('uploads a file and puts its address in', async () => {
    const { fixture, page, area, http } = await render('', 0);
    button(page, 'Image or GIF').click();
    await fixture.whenStable();
    http.expectOne('/api/gifs/available').flush({ available: false });

    const input = page.querySelector('input[type=file]') as HTMLInputElement;
    const file = new File([new Uint8Array([71, 73, 70])], 'moogle.gif', { type: 'image/gif' });
    Object.defineProperty(input, 'files', { value: [file] });
    URL.createObjectURL = () => 'blob:preview';
    URL.revokeObjectURL = () => undefined;
    input.dispatchEvent(new Event('change'));
    type(page.querySelector('#media-description') as HTMLInputElement, 'A moogle');
    await fixture.whenStable();
    button(page, 'Add image').click();
    // The picture is prepared first (a small GIF is kept as it is).
    await fixture.whenStable();

    const request = http.expectOne('/api/media');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBe(file);
    expect(request.request.withCredentials).toBe(true);
    request.flush({
      media: { id: 'm1', url: 'https://site/api/media/m1', contentType: 'image/gif', width: 1, height: 1 },
    });
    await fixture.whenStable();

    expect(area.value).toBe('![A moogle](https://site/api/media/m1)\n');
  });

  it('shows why an upload was refused', async () => {
    const { fixture, page, http } = await render('', 0);
    button(page, 'Image or GIF').click();
    await fixture.whenStable();
    http.expectOne('/api/gifs/available').flush({ available: false });

    const input = page.querySelector('input[type=file]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'notes.txt', { type: 'text/plain' })] });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(page.querySelector('[role=alert]')?.textContent?.trim()).toBe('Choose a PNG, JPEG, WebP or GIF image.');
  });

  it('refuses a GIF over 1 MB right away, since it would lose its animation', async () => {
    const { fixture, page, http } = await render('', 0);
    button(page, 'Image or GIF').click();
    await fixture.whenStable();
    http.expectOne('/api/gifs/available').flush({ available: false });

    const input = page.querySelector('input[type=file]') as HTMLInputElement;
    const big = new File([new Uint8Array(1024 * 1024 + 1)], 'huge.gif', { type: 'image/gif' });
    Object.defineProperty(input, 'files', { value: [big] });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(page.querySelector('[role=alert]')?.textContent).toContain('GIFs keep their animation');
    http.expectNone('/api/media');
  });

  it('picks a GIF from the search, credited to GIPHY', async () => {
    const { fixture, page, area, http } = await render('', 0);
    button(page, 'Image or GIF').click();
    await fixture.whenStable();
    http.expectOne('/api/gifs/available').flush({ available: true });
    await fixture.whenStable();

    button(page, 'GIFs').click();
    await new Promise((resolve) => setTimeout(resolve, 450));
    const trending = http.expectOne((r) => r.url === '/api/gifs');
    expect(trending.request.params.get('q')).toBe('');
    trending.flush({
      gifs: [
        {
          id: 'g1',
          title: 'Dancing moogle',
          previewUrl: 'https://p/g1.gif',
          url: 'https://f/g1.gif',
          width: 1,
          height: 1,
        },
      ],
      next: null,
    });
    await fixture.whenStable();

    expect(page.querySelector('.attribution')?.textContent?.trim()).toBe('Powered by GIPHY');
    const gif = page.querySelector('button.gif') as HTMLButtonElement;
    expect(gif.querySelector('img')?.alt).toBe('Dancing moogle');
    gif.click();
    await fixture.whenStable();

    expect(area.value).toBe('![Dancing moogle](https://f/g1.gif)\n');
  });
});
