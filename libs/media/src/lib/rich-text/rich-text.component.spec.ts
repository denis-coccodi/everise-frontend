import { TestBed } from '@angular/core/testing';
import { RichTextComponent } from './rich-text.component';

describe('RichTextComponent', () => {
  async function render(text: string, compact = false) {
    const fixture = TestBed.createComponent(RichTextComponent);
    fixture.componentRef.setInput('text', text);
    fixture.componentRef.setInput('compact', compact);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows Markdown with images that load lazily', async () => {
    const page = await render('Hello **there**\n\n![A happy moogle](https://example.com/moogle.gif)');

    expect(page.querySelector('strong')?.textContent).toBe('there');
    const image = page.querySelector('img') as HTMLImageElement;
    expect(image.getAttribute('src')).toBe('https://example.com/moogle.gif');
    expect(image.alt).toBe('A happy moogle');
    expect(image.getAttribute('loading')).toBe('lazy');
  });

  it('shows a YouTube link alone on a line as a video, between the text', async () => {
    const page = await render('Before\n\nhttps://youtu.be/dQw4w9WgXcQ\n\nAfter');

    const parts = [...page.querySelector('.xiv-prose')!.children].map((el) => el.tagName.toLowerCase());
    expect(parts).toEqual(['div', 'cdt-youtube-embed', 'div']);
  });

  it('removes anything that could run', async () => {
    const page = await render(
      '<script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">x</a>',
    );

    expect(page.querySelector('script')).toBeNull();
    expect(page.querySelector('img')?.getAttribute('onerror')).toBeNull();
    // Angular marks it unsafe, so it doesn't run.
    expect(page.querySelector('a')?.getAttribute('href')).not.toMatch(/^javascript:/);
  });

  it('breaks lines as typed in comments', async () => {
    const page = await render('one\ntwo', true);

    expect(page.querySelector('.xiv-prose')?.classList).toContain('compact');
    expect(page.querySelector('br')).not.toBeNull();
  });
});
