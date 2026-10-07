import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ButtonComponent, DialogComponent, ImageCropperComponent, SquareCrop } from '@everise/ui/components';
import { canvasRenderer, encodePicture } from '../picture-encoder';

// The window shown after a picture is chosen: the person picks the square to
// use, and "Use this picture" hands over the result, cropped, resized and
// made light enough to store (see encodePicture).
@Component({
  selector: 'cdt-picture-crop-dialog',
  templateUrl: './picture-crop-dialog.component.html',
  styleUrl: './picture-crop-dialog.component.scss',
  imports: [ButtonComponent, DialogComponent, ImageCropperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PictureCropDialogComponent {
  readonly file = input.required<File>();
  readonly chosen = output<Blob>();
  readonly cancelled = output<void>();

  protected readonly url = computed(() => URL.createObjectURL(this.file()));
  protected readonly crop = signal<SquareCrop | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly unreadable = signal(false);

  private image: HTMLImageElement | null = null;
  private readonly cropper = viewChild(ImageCropperComponent);
  private readonly injector = inject(Injector);

  constructor() {
    // The picture's temporary URL is released with the dialog.
    effect((onCleanup) => {
      const url = this.url();
      onCleanup(() => URL.revokeObjectURL(url));
    });
  }

  protected onLoaded(image: HTMLImageElement) {
    this.image = image;
    afterNextRender(() => this.cropper()?.focus(), { injector: this.injector });
  }

  protected async use() {
    const crop = this.crop();
    if (!crop || !this.image) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      this.chosen.emit(await encodePicture(canvasRenderer(this.image, crop), crop, this.file().type));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "The picture couldn't be prepared.");
    } finally {
      this.busy.set(false);
    }
  }
}
