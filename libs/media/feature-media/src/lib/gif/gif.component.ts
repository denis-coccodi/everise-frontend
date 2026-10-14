import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { IconComponent } from '@everise/ui/components';

// A GIF that plays straight away, as on Discord, with a pause button: moving
// pictures that go on for more than a few seconds must be stoppable. For
// people who asked their system to reduce motion it starts paused. Pausing
// shows the current frame, copied onto a canvas.
@Component({
  selector: 'cdt-gif',
  template: `
    <ng-template #picture>
      <img #image [src]="src()" [alt]="alt()" [hidden]="paused()" loading="lazy" decoding="async" (load)="loaded()" />
      <canvas #still [hidden]="!paused()" role="img" [attr.aria-label]="alt() || null"></canvas>
    </ng-template>
    <!-- In a grid it opens larger, from the keyboard too; in the viewer it already is. -->
    @if (contain()) {
      <ng-container *ngTemplateOutlet="picture" />
    } @else {
      <button type="button" class="open" [attr.aria-label]="openLabel()" (click)="opened.emit()">
        <ng-container *ngTemplateOutlet="picture" />
      </button>
    }
    <button type="button" class="toggle" [attr.aria-pressed]="paused()" (click)="toggle()">
      <cdt-icon [name]="paused() ? 'play' : 'pause'" />
      <span class="visually-hidden">{{ paused() ? 'Play GIF' : 'Pause GIF' }}</span>
    </button>
    <span class="badge" aria-hidden="true">GIF</span>
  `,
  styleUrl: './gif.component.scss',
  imports: [IconComponent, NgTemplateOutlet],
  host: { '[class.contain]': 'contain()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GifComponent {
  readonly src = input.required<string>();
  readonly alt = input('');
  // Whole, at its own shape (the viewer); otherwise it fills its tile.
  readonly contain = input(false);
  // The picture clicked or its button pressed (not the pause button): to
  // open it larger.
  readonly opened = output<void>();

  protected readonly openLabel = computed(() => (this.alt() ? `Open GIF: ${this.alt()}` : 'Open GIF'));

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
