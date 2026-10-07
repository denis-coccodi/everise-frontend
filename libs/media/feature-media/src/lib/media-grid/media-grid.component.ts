import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { Attachment } from '@everise/core/api-types';
import { YouTubeVideo } from '../youtube';
import { YouTubeEmbedComponent } from '../youtube-embed/youtube-embed.component';
import { GifComponent } from '../gif/gif.component';
import { MediaViewerComponent } from '../media-viewer/media-viewer.component';

// A post's or comment's images, GIFs and videos, laid out as X does: one
// large, keeping its shape between 2:1 and 1:2; two side by side; three as
// one large and two small; four in a 2 × 2 grid. Images open in the viewer;
// GIFs play on their own; videos play in place when clicked. `compact` is a
// comment's smaller size.
@Component({
  selector: 'cdt-media-grid',
  templateUrl: './media-grid.component.html',
  styleUrl: './media-grid.component.scss',
  imports: [GifComponent, MediaViewerComponent, YouTubeEmbedComponent],
  host: { '[class.compact]': 'compact()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaGridComponent {
  readonly items = input.required<Attachment[]>();
  readonly compact = input(false);

  // The images and GIFs the viewer steps through, and the one open in it.
  protected readonly viewable = computed<Attachment[]>(() => this.items().filter((item) => item.kind !== 'video'));
  protected readonly viewing = signal<number | null>(null);

  protected readonly count = computed(() => Math.min(this.items().length, 4));

  // A single item keeps its own shape (within 2:1 and 1:2), a video 16:9;
  // a grid of several is 16:9 as a whole.
  protected readonly ratio = computed(() => {
    const items = this.items();
    if (items.length !== 1) return '16 / 9';
    const [item] = items;
    if (item.kind === 'video') return '16 / 9';
    if (item.width && item.height) {
      return String(Math.min(2, Math.max(0.5, item.width / item.height)));
    }
    return null;
  });

  protected videoOf(item: Attachment): YouTubeVideo {
    return item.kind === 'video' ? { id: item.videoId, start: item.start ?? 0 } : { id: '', start: 0 };
  }

  protected open(item: Attachment) {
    this.viewing.set(this.viewable().indexOf(item));
  }

  protected label(item: Attachment) {
    const which = this.viewable().length > 1 ? ` ${this.viewable().indexOf(item) + 1}` : '';
    return item.alt ? `Open image${which}: ${item.alt}` : `Open image${which}`;
  }
}
