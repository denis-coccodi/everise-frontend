import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { YouTubeVideo, youTubeLink } from '../youtube';

// A YouTube video in a post or comment: its thumbnail with a play button,
// and only after a click the player itself, from YouTube's privacy-enhanced
// domain. Until then nothing is loaded from YouTube but the picture.
@Component({
  selector: 'cdt-youtube-embed',
  templateUrl: './youtube-embed.component.html',
  styleUrl: './youtube-embed.component.scss',
  host: { '[class.fill]': 'fill()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YouTubeEmbedComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly video = input.required<YouTubeVideo>();
  // Fills a tile of a media grid (no "Watch on YouTube" link under it).
  readonly fill = input(false);

  protected readonly playing = signal(false);
  protected readonly thumbnail = computed(() => `https://i.ytimg.com/vi/${this.video().id}/hqdefault.jpg`);
  protected readonly watchLink = computed(() => youTubeLink(this.video()));
  // The id is checked against YouTube's 11-character format, so the address
  // can only ever be a YouTube player.
  protected readonly player = computed(() => {
    const { id, start } = this.video();
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube-nocookie.com/embed/${id}?autoplay=1${start ? `&start=${start}` : ''}`,
    );
  });

  protected play() {
    this.playing.set(true);
  }
}
