import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { ButtonComponent } from '@realworld/ui/components';
import { ImageDialogComponent } from './image-dialog.component';
import { YouTubeDialogComponent } from './youtube-dialog.component';

// Under a text area for a post or comment: "Image or GIF" and "YouTube
// video". What's chosen goes in at the cursor, on a line of its own, as
// Markdown (an image) or a link (a video), so the text stays plain to edit.
// `for` is the text area's id; it's updated as if typed, so forms see it.
@Component({
  selector: 'cdt-media-tools',
  templateUrl: './media-tools.component.html',
  styleUrl: './media-tools.component.scss',
  imports: [ButtonComponent, ImageDialogComponent, YouTubeDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaToolsComponent {
  readonly for = input.required<string>();

  protected readonly open = signal<'image' | 'youtube' | null>(null);

  protected insert(text: string) {
    this.open.set(null);
    const area = document.getElementById(this.for()) as HTMLTextAreaElement | null;
    if (!area) return;
    const start = area.selectionStart ?? area.value.length;
    const end = area.selectionEnd ?? start;
    const before = area.value.slice(0, start);
    const after = area.value.slice(end);
    const block = `${before && !before.endsWith('\n') ? '\n' : ''}${text}${after.startsWith('\n') ? '' : '\n'}`;
    area.setRangeText(block, start, end, 'end');
    area.dispatchEvent(new Event('input', { bubbles: true }));
    area.focus();
  }

  // Back to the text area after closing without choosing.
  protected close() {
    this.open.set(null);
    document.getElementById(this.for())?.focus();
  }
}
