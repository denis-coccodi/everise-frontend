import { TestBed } from '@angular/core/testing';
import { Attachment } from '@realworld/core/api-types';
import { MediaGridComponent } from './media-grid.component';

describe('MediaGridComponent', () => {
  async function render(items: Attachment[], compact = false) {
    const fixture = TestBed.createComponent(MediaGridComponent);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('compact', compact);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  }

  afterEach(() => document.body.replaceChildren());

  const cat: Attachment = { kind: 'image', url: 'https://x/cat.png', alt: 'A cat', width: 3000, height: 1000 };
  const dog: Attachment = { kind: 'image', url: 'https://x/dog.png' };
  const dance: Attachment = { kind: 'gif', url: 'https://x/dance.gif', alt: 'Dancing' };
  const video: Attachment = {
    kind: 'video',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoId: 'dQw4w9WgXcQ',
  };

  it('shows nothing without media', async () => {
    const { page } = await render([]);

    expect(page.querySelector('.grid')).toBeNull();
  });

  it('keeps a single image to its shape, within 2:1', async () => {
    const { page } = await render([cat]);

    const grid = page.querySelector('.grid') as HTMLElement;
    expect(grid.dataset['count']).toBe('1');
    expect(grid.style.aspectRatio).toBe('2');
    expect(page.querySelector('button.open')?.getAttribute('aria-label')).toBe('Open image: A cat');
  });

  it('lays out several in a grid: images, a GIF that plays, a video that plays when clicked', async () => {
    const { page } = await render([cat, dance, video]);

    const grid = page.querySelector('.grid') as HTMLElement;
    expect(grid.dataset['count']).toBe('3');
    expect(page.querySelectorAll('.tile')).toHaveLength(3);
    expect(page.querySelector('cdt-gif img')?.getAttribute('src')).toBe('https://x/dance.gif');
    expect(page.querySelector('cdt-gif button')?.textContent?.trim()).toBe('Pause GIF');
    expect(page.querySelector('cdt-youtube-embed button.poster')?.textContent?.trim()).toBe('Play YouTube video');
    expect(page.querySelector('cdt-youtube-embed a.watch')).toBeNull();
  });

  it('opens images and GIFs in the viewer, stepping through them', async () => {
    const { fixture, page } = await render([cat, video, dog, dance]);

    (page.querySelectorAll('button.open')[1] as HTMLButtonElement).click();
    await fixture.whenStable();
    const dialog = () => page.querySelector('[role=dialog]') as HTMLElement;
    expect(dialog().textContent).toContain('Image 2 of 3');
    expect(dialog().querySelector('img')?.getAttribute('src')).toBe('https://x/dog.png');

    const next = [...dialog().querySelectorAll('button')].find(
      (b) => b.textContent?.includes('Next'),
    ) as HTMLButtonElement;
    next.click();
    await fixture.whenStable();
    expect(dialog().textContent).toContain('Image 3 of 3');
    expect(dialog().querySelector('cdt-gif img')?.getAttribute('src')).toBe('https://x/dance.gif');

    // Around to the first.
    dialog()
      .closest('cdt-media-viewer')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    await fixture.whenStable();
    expect(dialog().textContent).toContain('Image 1 of 3');
    expect(dialog().textContent).toContain('A cat');

    const close = [...dialog().querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Close',
    ) as HTMLButtonElement;
    close.click();
    await fixture.whenStable();
    expect(page.querySelector('[role=dialog]')).toBeNull();
  });

  it("is smaller for a comment's attachment", async () => {
    const { fixture } = await render([dog], true);

    expect((fixture.nativeElement as HTMLElement).classList).toContain('compact');
  });
});
