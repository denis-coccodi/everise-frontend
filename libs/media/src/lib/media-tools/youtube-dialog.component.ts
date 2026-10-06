import { ChangeDetectionStrategy, Component, afterNextRender, computed, output, signal } from '@angular/core';
import { ButtonComponent, DialogComponent, FieldComponent, InputComponent } from '@realworld/ui/components';
import { NewAttachment } from '@realworld/core/api-types';
import { youTubeLink, youTubeVideo } from '../youtube';

// "Add a YouTube video": a link YouTube shares, checked and previewed.
// Emits the attachment.
@Component({
  selector: 'cdt-youtube-dialog',
  templateUrl: './youtube-dialog.component.html',
  styleUrl: './youtube-dialog.component.scss',
  imports: [ButtonComponent, DialogComponent, FieldComponent, InputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YouTubeDialogComponent {
  readonly chosen = output<NewAttachment>();
  readonly dismissed = output<void>();

  protected readonly link = signal('');
  protected readonly video = computed(() => youTubeVideo(this.link()));
  protected readonly thumbnail = computed(() => {
    const video = this.video();
    return video ? `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg` : null;
  });

  constructor() {
    // Straight to the link field.
    afterNextRender(() => document.getElementById('youtube-link')?.focus());
  }

  protected add() {
    const video = this.video();
    if (video) this.chosen.emit({ kind: 'video', url: youTubeLink(video) });
  }
}
