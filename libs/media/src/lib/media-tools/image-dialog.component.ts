import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NewAttachment } from '@everise/core/api-types';
import { serverMessage } from '@everise/core/forms';
import {
  ButtonComponent,
  DialogComponent,
  FieldComponent,
  InputComponent,
  MessageComponent,
  TabComponent,
  TabsComponent,
} from '@everise/ui/components';
import { Gif, MediaService } from '../media.service';
import { GifPickerComponent } from './gif-picker.component';
import { GIF_TOO_LARGE, MAX_UPLOAD_BYTES, canvasRenderer, fitImage } from './image-fitter';

type Mode = 'upload' | 'link' | 'gifs';

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
// Bigger files aren't worth decoding in the browser to shrink.
const MAX_SOURCE_MB = 30;

// "Add an image or GIF": upload one, link to one, or pick a GIF from GIPHY
// (cdt-gif-picker). Emits the attachment.
@Component({
  selector: 'cdt-image-dialog',
  templateUrl: './image-dialog.component.html',
  styleUrl: './image-dialog.component.scss',
  imports: [
    ButtonComponent,
    DialogComponent,
    FieldComponent,
    GifPickerComponent,
    InputComponent,
    MessageComponent,
    TabComponent,
    TabsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageDialogComponent {
  private readonly media = inject(MediaService);

  readonly chosen = output<NewAttachment>();
  readonly dismissed = output<void>();

  protected readonly gifsAvailable = toSignal(this.media.gifsAvailable$, { initialValue: false });
  protected readonly mode = signal<Mode>('upload');
  protected readonly description = signal('');
  protected readonly error = signal<string | null>(null);
  // What the Add button is doing: making the picture smaller, or uploading.
  protected readonly busy = signal<'preparing' | 'uploading' | false>(false);

  // Upload.
  protected readonly file = signal<File | null>(null);
  protected readonly preview = signal<string | null>(null);

  // Link, and the linked picture's size once its preview loads.
  protected readonly link = signal('');
  private readonly linkedSize = signal<{ width: number; height: number } | null>(null);
  protected readonly linkValid = computed(() => /^https:\/\/\S+$/i.test(this.link().trim()));

  protected readonly canAdd = computed(() => {
    if (this.busy()) return false;
    return this.mode() === 'upload' ? !!this.file() : this.mode() === 'link' && this.linkValid();
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.revokePreview());
  }

  protected setMode(mode: Mode) {
    this.mode.set(mode);
    this.error.set(null);
  }

  protected chooseFile(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      this.error.set('Choose a PNG, JPEG, WebP or GIF image.');
      return;
    }
    if (file.type === 'image/gif' && file.size > MAX_UPLOAD_BYTES) {
      this.error.set(GIF_TOO_LARGE);
      return;
    }
    if (file.size > MAX_SOURCE_MB * 1024 * 1024) {
      this.error.set(`That file is too large: choose one under ${MAX_SOURCE_MB} MB.`);
      return;
    }
    this.error.set(null);
    this.revokePreview();
    this.file.set(file);
    this.preview.set(URL.createObjectURL(file));
  }

  // The linked picture loaded: its size keeps its space in the feeds.
  protected linkedLoaded(image: HTMLImageElement) {
    this.linkedSize.set({ width: image.naturalWidth, height: image.naturalHeight });
  }

  protected setLink(value: string) {
    this.link.set(value);
    this.linkedSize.set(null);
  }

  protected pickGif(gif: Gif) {
    this.chosen.emit({
      kind: 'gif',
      url: gif.url,
      alt: gif.title,
      width: gif.width || undefined,
      height: gif.height || undefined,
    });
  }

  protected async add() {
    const description = this.description();
    if (this.mode() === 'link') {
      const url = this.link().trim();
      this.chosen.emit({
        kind: /\.gif(\?|$)/i.test(url) ? 'gif' : 'image',
        url,
        alt: description.trim(),
        ...(this.linkedSize() ?? {}),
      });
      return;
    }
    const file = this.file();
    if (!file) return;
    this.error.set(null);
    this.busy.set('preparing');
    let upload: Blob;
    try {
      // Made to fit 1 MB here, so the backend gets a small file.
      upload = await fitImage(file, () => canvasRenderer(file));
    } catch (err) {
      this.busy.set(false);
      this.error.set(err instanceof Error ? err.message : String(err));
      return;
    }
    this.busy.set('uploading');
    this.media.upload(upload).subscribe({
      next: (media) => {
        this.busy.set(false);
        this.chosen.emit({
          kind: media.contentType === 'image/gif' ? 'gif' : 'image',
          url: media.url,
          alt: description.trim(),
          width: media.width,
          height: media.height,
        });
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(serverMessage(error));
      },
    });
  }

  private revokePreview() {
    const url = this.preview();
    if (url) URL.revokeObjectURL(url);
  }
}
