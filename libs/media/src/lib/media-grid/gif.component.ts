import { ChangeDetectionStrategy, Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { IconComponent } from '@realworld/ui/components';

// A GIF that plays straight away, as on Discord, with a pause button: moving
// pictures that go on for more than a few seconds must be stoppable. For
// people who asked their system to reduce motion it starts paused. Pausing
// shows the current frame, copied onto a canvas.
@Component({
  selector: 'cdt-gif',
  template: `
    <img
      #image
      [src]="src()"
      [alt]="alt()"
      [hidden]="paused()"
      loading="lazy"
      decoding="async"
      (load)="loaded()"
      (click)="opened.emit()"
    />
    <canvas #still [hidden]="!paused()" role="img" [attr.aria-label]="alt() || null" (click)="opened.emit()"></canvas>
    <button type="button" class="toggle" [attr.aria-pressed]="paused()" (click)="toggle()">
      <cdt-icon [name]="paused() ? 'play' : 'pause'" />
      <span class="visually-hidden">{{ paused() ? 'Play GIF' : 'Pause GIF' }}</span>
    </button>
    <span class="badge" aria-hidden="true">GIF</span>
  `,
  styleUrl: './gif.component.scss',
  imports: [IconComponent],
  host: { '[class.contain]': 'contain()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GifComponent {
  readonly src = input.required<string>();
  readonly alt = input('');
  // Whole, at its own shape (the viewer); otherwise it fills its tile.
  readonly contain = input(false);
  // A click on the picture (not the button): to open it larger.
  readonly opened = output<void>();

  protected readonly paused = signal(
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  private readonly image = viewChild.required<ElementRef<HTMLImageElement>>('image');
  private readonly still = viewChild.required<ElementRef<HTMLCanvasElement>>('still');

  protected loaded() {
    if (this.paused()) this.freeze();
  }

  protected toggle() {
    if (!this.paused()) this.freeze();
    this.paused.update((paused) => !paused);
  }

  // Copies the frame showing now onto the canvas.
  private freeze() {
    const image = this.image().nativeElement;
    const canvas = this.still().nativeElement;
    if (!image.naturalWidth) return;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d')?.drawImage(image, 0, 0);
  }
}
