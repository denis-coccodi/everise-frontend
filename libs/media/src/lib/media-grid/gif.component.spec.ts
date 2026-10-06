import { TestBed } from '@angular/core/testing';
import { GifComponent } from './gif.component';

describe('GifComponent', () => {
  const realMatchMedia = globalThis.matchMedia;

  function prefersReducedMotion(reduce: boolean) {
    globalThis.matchMedia = ((query: string) => ({ matches: reduce && query.includes('reduce') })) as typeof matchMedia;
  }

  async function render() {
    const fixture = TestBed.createComponent(GifComponent);
    fixture.componentRef.setInput('src', 'https://x/dance.gif');
    fixture.componentRef.setInput('alt', 'Dancing');
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    return { fixture, page, button: page.querySelector('button.toggle') as HTMLButtonElement };
  }

  afterEach(() => {
    globalThis.matchMedia = realMatchMedia;
  });

  it('plays straight away, and pauses and plays again on request', async () => {
    prefersReducedMotion(false);
    const { fixture, page, button } = await render();

    expect(page.querySelector('img')?.hidden).toBe(false);
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.textContent?.trim()).toBe('Pause GIF');

    button.click();
    await fixture.whenStable();
    expect(page.querySelector('img')?.hidden).toBe(true);
    expect(page.querySelector('canvas')?.hidden).toBe(false);
    expect(page.querySelector('canvas')?.getAttribute('aria-label')).toBe('Dancing');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.textContent?.trim()).toBe('Play GIF');

    button.click();
    await fixture.whenStable();
    expect(page.querySelector('img')?.hidden).toBe(false);
  });

  it('starts paused for people who asked for less motion', async () => {
    prefersReducedMotion(true);
    const { button } = await render();

    expect(button.textContent?.trim()).toBe('Play GIF');
  });
});
