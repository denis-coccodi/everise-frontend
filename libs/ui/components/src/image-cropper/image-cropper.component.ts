import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  ImageSize,
  SquareCrop,
  centeredCrop,
  cropSizeRange,
  moveCrop,
  resizeCrop,
  resizeFromCorner,
} from './crop-geometry';

type Drag = { mode: 'move' | 'resize'; startX: number; startY: number; start: SquareCrop; scale: number };

// Picks a square area of a picture, e.g. for a profile picture:
// <cdt-image-cropper [src]="url" [(crop)]="crop" (loaded)="image = $event" />.
//
// Drag the square to move it and its corner to resize it, or use the size
// slider; on the square, the arrow keys move it (with Shift, further) and
// + and − resize it. A circle inside shows a round avatar's shape. `crop` is
// in the picture's own pixels; `loaded` hands over the image element, to draw
// the chosen area from, and `failed` reports a picture the browser can't open.
@Component({
  selector: 'cdt-image-cropper',
  templateUrl: './image-cropper.component.html',
  styleUrl: './image-cropper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageCropperComponent {
  readonly src = input.required<string>();
  readonly crop = model<SquareCrop | null>(null);
  readonly loaded = output<HTMLImageElement>();
  readonly failed = output<void>();

  protected readonly image = signal<ImageSize | null>(null);
  protected readonly range = computed(() => {
    const image = this.image();
    return image && cropSizeRange(image);
  });

  // The square's position and size as percentages of the shown picture.
  protected readonly box = computed(() => {
    const image = this.image();
    const crop = this.crop();
    if (!image || !crop) return null;
    return {
      left: (crop.x / image.width) * 100,
      top: (crop.y / image.height) * 100,
      width: (crop.size / image.width) * 100,
      height: (crop.size / image.height) * 100,
    };
  });

  private drag: Drag | null = null;
  private readonly selection = viewChild<ElementRef<HTMLElement>>('selection');

  // Puts the keyboard focus on the square, once the picture has loaded.
  focus() {
    this.selection()?.nativeElement.focus();
  }

  protected onLoad(element: HTMLImageElement) {
    const image = { width: element.naturalWidth, height: element.naturalHeight };
    this.image.set(image);
    this.crop.set(centeredCrop(image));
    this.loaded.emit(element);
  }

  protected startDrag(event: PointerEvent, mode: Drag['mode'], shown: HTMLImageElement) {
    const crop = this.crop();
    const image = this.image();
    if (!crop || !image || shown.clientWidth === 0) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.drag = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      start: crop,
      // Screen pixels to picture pixels.
      scale: image.width / shown.clientWidth,
    };
  }

  protected onDrag(event: PointerEvent) {
    const drag = this.drag;
    const image = this.image();
    if (!drag || !image) return;
    const dx = (event.clientX - drag.startX) * drag.scale;
    const dy = (event.clientY - drag.startY) * drag.scale;
    this.crop.set(
      drag.mode === 'move'
        ? moveCrop(drag.start, dx, dy, image)
        : resizeFromCorner(drag.start, Math.max(dx, dy), image),
    );
  }

  protected endDrag() {
    this.drag = null;
  }

  protected onKeydown(event: KeyboardEvent) {
    const crop = this.crop();
    const image = this.image();
    const range = this.range();
    if (!crop || !image || !range) return;
    // A step is 2% of the picture's shorter side, 10% with Shift.
    const step = Math.max(1, Math.round(range.max * (event.shiftKey ? 0.1 : 0.02)));
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (event.key in moves) {
      event.preventDefault();
      this.crop.set(moveCrop(crop, ...moves[event.key], image));
    } else if (event.key === '+' || event.key === '=' || event.key === '-') {
      event.preventDefault();
      this.crop.set(resizeCrop(crop, crop.size + (event.key === '-' ? -step : step), image));
    }
  }

  protected resize(size: number) {
    const crop = this.crop();
    const image = this.image();
    if (crop && image && !Number.isNaN(size)) {
      this.crop.set(resizeCrop(crop, size, image));
    }
  }
}
