import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { Attachment } from '@everise/core/api-types';
import { ButtonComponent, DialogComponent, IconComponent } from '@everise/ui/components';
import { GifComponent } from '../gif/gif.component';

// The post's images and GIFs, one at a time and as large as the screen
// allows, with Previous and Next (also the arrow keys). Opened from a grid.
@Component({
  selector: 'cdt-media-viewer',
  templateUrl: './media-viewer.component.html',
  styleUrl: './media-viewer.component.scss',
  imports: [ButtonComponent, DialogComponent, GifComponent, IconComponent],
  host: { '(keydown.arrowleft)': 'step(-1)', '(keydown.arrowright)': 'step(1)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaViewerComponent {
  readonly items = input.required<Attachment[]>();
  readonly index = model(0);
  readonly closed = output<void>();

  protected readonly current = computed(() => this.items()[this.index()]);
  protected readonly heading = computed(() =>
    this.items().length > 1 ? `Image ${this.index() + 1} of ${this.items().length}` : 'Image',
  );

  protected step(by: -1 | 1) {
    const count = this.items().length;
    if (count > 1) this.index.set((this.index() + by + count) % count);
  }
}
