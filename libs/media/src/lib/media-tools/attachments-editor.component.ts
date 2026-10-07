import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { NewAttachment } from '@everise/core/api-types';
import { ButtonComponent, IconComponent } from '@everise/ui/components';
import { youTubeVideo } from '../youtube';
import { ImageDialogComponent } from './image-dialog.component';
import { YouTubeDialogComponent } from './youtube-dialog.component';

// Under the text of a post or comment: "Image or GIF" and "YouTube video",
// and what's attached so far, as thumbnails to remove or put in order.
// `max` is how many fit: 4 on a post, 1 on a comment.
@Component({
  selector: 'cdt-attachments-editor',
  templateUrl: './attachments-editor.component.html',
  styleUrl: './attachments-editor.component.scss',
  imports: [ButtonComponent, ImageDialogComponent, YouTubeDialogComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentsEditorComponent {
  readonly items = model<NewAttachment[]>([]);
  readonly max = input(4);

  protected readonly open = signal<'image' | 'youtube' | null>(null);
  protected readonly full = computed(() => this.items().length >= this.max());
  // Said to screen readers after a change.
  protected readonly status = signal('');

  protected readonly thumbnails = computed(() =>
    this.items().map((item) => ({
      item,
      src: item.kind === 'video' ? videoThumbnail(item.url) : item.url,
      label: item.alt?.trim() || (item.kind === 'video' ? 'YouTube video' : item.kind === 'gif' ? 'GIF' : 'Image'),
    })),
  );

  protected add(item: NewAttachment) {
    this.open.set(null);
    if (this.full()) return;
    this.items.update((items) => [...items, item]);
    this.status.set(`${describe(item)} added.`);
  }

  protected remove(index: number) {
    const removed = this.items()[index];
    this.items.update((items) => items.filter((_, i) => i !== index));
    this.status.set(`${describe(removed)} removed.`);
  }

  protected move(index: number, by: -1 | 1) {
    const to = index + by;
    this.items.update((items) => {
      const next = [...items];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
    this.status.set(`Moved to position ${to + 1} of ${this.items().length}.`);
  }
}

function videoThumbnail(url: string) {
  const video = youTubeVideo(url);
  return video ? `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg` : '';
}

function describe(item: NewAttachment) {
  return item.kind === 'video' ? 'Video' : item.kind === 'gif' ? 'GIF' : 'Image';
}
