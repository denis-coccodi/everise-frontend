import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NewAttachment } from '@realworld/core/api-types';
import { API_URL } from '@realworld/core/http-client';
import { AttachmentsEditorComponent } from './attachments-editor.component';

@Component({
  template: `<cdt-attachments-editor [(items)]="items" [max]="max()" />`,
  imports: [AttachmentsEditorComponent],
})
class HostComponent {
  readonly items = signal<NewAttachment[]>([]);
  readonly max = signal(4);
}

describe('AttachmentsEditorComponent', () => {
  async function render(items: NewAttachment[] = [], max = 4) {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '/api' }],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.items.set(items);
    fixture.componentInstance.max.set(max);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const http = TestBed.inject(HttpTestingController);
    return { fixture, page, http, items: fixture.componentInstance.items };
  }

  const button = (page: HTMLElement, text: string) =>
    [...page.querySelectorAll('button')].find((b) => b.textContent?.replace(/\s+/g, ' ').trim() === text);

  const type = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  async function openImageDialog(
    fixture: { whenStable(): Promise<unknown> },
    page: HTMLElement,
    http: HttpTestingController,
    gifs = false,
  ) {
    button(page, 'Image or GIF')!.click();
    await fixture.whenStable();
    http.expectOne('/api/gifs/available').flush({ available: gifs });
    await fixture.whenStable();
  }

  afterEach(() => document.body.replaceChildren());

  it('attaches a YouTube video', async () => {
    const { fixture, page, items } = await render();

    button(page, 'YouTube video')!.click();
    await fixture.whenStable();
    expect(document.activeElement?.id).toBe('youtube-link');
    type(page.querySelector('#youtube-link') as HTMLInputElement, 'https://youtu.be/dQw4w9WgXcQ');
    await fixture.whenStable();
    button(page, 'Add video')!.click();
    await fixture.whenStable();

    expect(items()).toEqual([{ kind: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }]);
    expect(page.querySelector('[role=dialog]')).toBeNull();
    expect(page.querySelector('[role=status]')?.textContent).toContain('Video added.');
  });

  it('turns down a link that is not a YouTube video', async () => {
    const { fixture, page } = await render();

    button(page, 'YouTube video')!.click();
    await fixture.whenStable();
    type(page.querySelector('#youtube-link') as HTMLInputElement, 'https://example.com/video');
    await fixture.whenStable();

    expect(button(page, 'Add video')!.disabled).toBe(true);
    expect(page.querySelector('[role=dialog] [role=status]')?.textContent).toContain("isn't a YouTube video link");
  });

  it('attaches a linked image, with or without a description', async () => {
    const { fixture, page, http, items } = await render();
    await openImageDialog(fixture, page, http);

    button(page, 'Link')!.click();
    await fixture.whenStable();
    type(page.querySelector('#media-link') as HTMLInputElement, 'https://example.com/cat.png');
    await fixture.whenStable();
    expect(button(page, 'Add image')!.disabled).toBe(false);
    type(page.querySelector('#media-description') as HTMLInputElement, 'A cat');
    await fixture.whenStable();
    button(page, 'Add image')!.click();
    await fixture.whenStable();

    expect(items()).toEqual([{ kind: 'image', url: 'https://example.com/cat.png', alt: 'A cat' }]);
  });

  it('uploads a GIF and attaches it, with its size', async () => {
    const { fixture, page, http, items } = await render();
    await openImageDialog(fixture, page, http);

    const input = page.querySelector('input[type=file]') as HTMLInputElement;
    const file = new File([new Uint8Array([71, 73, 70])], 'moogle.gif', { type: 'image/gif' });
    Object.defineProperty(input, 'files', { value: [file] });
    URL.createObjectURL = () => 'blob:preview';
    URL.revokeObjectURL = () => undefined;
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    button(page, 'Add image')!.click();
    await fixture.whenStable();

    const request = http.expectOne('/api/media');
    expect(request.request.body).toBe(file);
    request.flush({
      media: { id: 'm1', url: 'https://site/api/media/m1', contentType: 'image/gif', width: 240, height: 135 },
    });
    await fixture.whenStable();

    expect(items()).toEqual([{ kind: 'gif', url: 'https://site/api/media/m1', alt: '', width: 240, height: 135 }]);
  });

  it('refuses a GIF over 1 MB right away, since it would lose its animation', async () => {
    const { fixture, page, http } = await render();
    await openImageDialog(fixture, page, http);

    const input = page.querySelector('input[type=file]') as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      value: [new File([new Uint8Array(1024 * 1024 + 1)], 'huge.gif', { type: 'image/gif' })],
    });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(page.querySelector('[role=alert]')?.textContent).toContain('GIFs keep their animation');
    http.expectNone('/api/media');
  });

  it('picks a GIF from the search, credited to GIPHY', async () => {
    const { fixture, page, http, items } = await render();
    await openImageDialog(fixture, page, http, true);

    button(page, 'GIFs')!.click();
    await new Promise((resolve) => setTimeout(resolve, 450));
    http
      .expectOne((r) => r.url === '/api/gifs')
      .flush({
        gifs: [
          {
            id: 'g1',
            title: 'Dancing moogle',
            previewUrl: 'https://p/g1.gif',
            url: 'https://f/g1.gif',
            width: 480,
            height: 270,
          },
        ],
        next: null,
      });
    await fixture.whenStable();
    expect(page.querySelector('.attribution')?.textContent?.trim()).toBe('Powered by GIPHY');
    (page.querySelector('button.gif') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(items()).toEqual([{ kind: 'gif', url: 'https://f/g1.gif', alt: 'Dancing moogle', width: 480, height: 270 }]);
  });

  it('removes and reorders what is attached, and stops at the limit', async () => {
    const a: NewAttachment = { kind: 'image', url: 'https://x/a.png', alt: 'A' };
    const b: NewAttachment = { kind: 'gif', url: 'https://x/b.gif', alt: 'B' };
    const { fixture, page, items } = await render([a, b], 2);

    expect(button(page, 'Image or GIF')!.disabled).toBe(true);
    expect(button(page, 'YouTube video')!.disabled).toBe(true);
    expect(page.querySelector('.count')?.textContent?.trim()).toBe('2 of 2');

    button(page, 'Move B earlier')!.click();
    await fixture.whenStable();
    expect(items()).toEqual([b, a]);

    button(page, 'Remove B')!.click();
    await fixture.whenStable();
    expect(items()).toEqual([a]);
    expect(button(page, 'Image or GIF')!.disabled).toBe(false);
  });

  it('has no reordering when only one fits (a comment)', async () => {
    const { page } = await render([{ kind: 'image', url: 'https://x/a.png', alt: 'A' }], 1);

    expect(button(page, 'Move A earlier')).toBeUndefined();
    expect(button(page, 'Remove A')).toBeDefined();
    expect(page.querySelector('.count')).toBeNull();
  });
});
