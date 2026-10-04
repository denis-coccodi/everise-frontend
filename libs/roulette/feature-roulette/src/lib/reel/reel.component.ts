import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { reducedMotion, wait } from '../wheel/wheel.component';

export interface ReelItem {
  title: string;
  detail: string;
}

// Rows scrolled past before the winner, and the row height in the template.
const FILLER_ROWS = 34;
const ROW_HEIGHT = 52;

const IDLE: ReelItem[] = [
  { title: '· · ·', detail: '' },
  { title: '· · ·', detail: '' },
  { title: '· · ·', detail: '' },
];

// A slot-machine reel for the second wheel, which can have a hundred entries:
// too many for readable wheel segments.
@Component({
  selector: 'cdt-roulette-reel',
  templateUrl: './reel.component.html',
  styleUrls: ['./reel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReelComponent {
  readonly caption = input.required<string>();

  readonly rows = signal<ReelItem[]>(IDLE);
  readonly spinning = signal(false);
  readonly landed = signal(false);

  private readonly strip = viewChild.required<ElementRef<HTMLElement>>('strip');
  private readonly cdr = inject(ChangeDetectorRef);

  // Scrolls through random entries and stops on `winner`.
  async spinTo(items: ReelItem[], winner: ReelItem, random: () => number = Math.random) {
    const fillers = Array.from({ length: FILLER_ROWS }, () => items[Math.floor(random() * items.length)]);
    const after = items[Math.floor(random() * items.length)];
    // The winner sits in the middle row of the three visible ones.
    this.rows.set([...fillers, winner, after]);
    this.landed.set(false);
    this.spinning.set(true);
    this.cdr.detectChanges();

    const strip = this.strip().nativeElement;
    strip.style.transition = 'none';
    strip.style.transform = 'translateY(0)';
    strip.getBoundingClientRect();

    const duration = reducedMotion() ? 300 : 3600 + random() * 900;
    strip.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.75, 0.12, 1)`;
    strip.style.transform = `translateY(-${(FILLER_ROWS - 1) * ROW_HEIGHT}px)`;
    await wait(duration + 50);

    this.spinning.set(false);
    this.landed.set(true);
  }
}
