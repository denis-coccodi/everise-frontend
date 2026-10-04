import { ChangeDetectionStrategy, Component, ElementRef, computed, input, signal, viewChild } from '@angular/core';
import { segmentAt, targetRotation, wheelSegments } from './wheel-geometry';

const RADIUS = 100;
const RIM_LIGHTS = 24;

// Gives each wheel its own SVG gradient ids.
let nextWheelId = 0;

// A Gold Saucer style wheel. The parent calls spinTo() with the segment it has
// already drawn; the wheel only animates to it.
@Component({
  selector: 'cdt-roulette-wheel',
  templateUrl: './wheel.component.html',
  styleUrls: ['./wheel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WheelComponent {
  readonly segments = input.required<string[]>();
  readonly caption = input.required<string>();

  readonly radius = RADIUS;
  private readonly id = nextWheelId++;
  readonly goldId = `wheel-gold-${this.id}`;
  readonly crystalId = `wheel-crystal-${this.id}`;
  readonly goldFill = `url(#${this.goldId})`;
  readonly crystalFill = `url(#${this.crystalId})`;
  readonly lights = Array.from({ length: RIM_LIGHTS }, (_, i) => {
    const angle = (i * 2 * Math.PI) / RIM_LIGHTS;
    return { x: 108 * Math.sin(angle), y: -108 * Math.cos(angle) };
  });

  readonly paths = computed(() => {
    const labels = this.segments();
    const maxLength = labels.length <= 4 ? 24 : labels.length <= 8 ? 16 : 12;
    return wheelSegments(labels, RADIUS, maxLength);
  });
  readonly fontSize = computed(() => (this.segments().length <= 4 ? 10 : this.segments().length <= 8 ? 8.5 : 7));

  readonly spinning = signal(false);
  readonly winner = signal<number | null>(null);

  private readonly rotor = viewChild.required<ElementRef<SVGGElement>>('rotor');
  private rotation = 0;

  // Each spin turns on from wherever the wheel stopped, also after the
  // segments change. (Resetting to 0° first doesn't work: without a frame in
  // between, the browser animates from the old angle, a fraction of a turn.)
  async spinTo(index: number, random: () => number = Math.random) {
    const count = this.segments().length;
    const duration = reducedMotion() ? 300 : 4200 + random() * 1200;

    this.winner.set(null);
    this.spinning.set(true);
    this.rotation = targetRotation(this.rotation, index, count, reducedMotion() ? 1 : 5, random() - 0.5);

    const rotor = this.rotor().nativeElement;
    rotor.style.transition = `transform ${duration}ms cubic-bezier(0.12, 0.72, 0.1, 1)`;
    rotor.style.transform = `rotate(${this.rotation}deg)`;
    await wait(duration + 50);

    this.spinning.set(false);
    this.winner.set(segmentAt(this.rotation, count));
  }
}

export function reducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
