import { TestBed } from '@angular/core/testing';
import { YouTubeEmbedComponent } from './youtube-embed.component';

describe('YouTubeEmbedComponent', () => {
  it('shows the thumbnail until played, then the privacy-enhanced player', async () => {
    const fixture = TestBed.createComponent(YouTubeEmbedComponent);
    fixture.componentRef.setInput('video', { id: 'dQw4w9WgXcQ', start: 42 });
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('iframe')).toBeNull();
    const play = page.querySelector('button.poster') as HTMLButtonElement;
    expect(play.textContent?.trim()).toBe('Play YouTube video');
    expect(play.querySelector('img')?.getAttribute('src')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    expect(page.querySelector('a.watch')?.getAttribute('href')).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
    );

    play.click();
    await fixture.whenStable();

    const player = page.querySelector('iframe') as HTMLIFrameElement;
    expect(player.src).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&start=42');
    expect(player.title).toBe('YouTube video');
  });
});
