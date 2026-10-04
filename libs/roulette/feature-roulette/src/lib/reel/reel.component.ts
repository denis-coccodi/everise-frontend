import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { reducedMotion, wait } from '../motion';

export interface ReelItem {
  title: string;
  detail: string;
}

// Rows scrolled past before the winner, and the row height in the template.
const FILLER_ROWS = 34;
const ROW_HEIGHT = 52;
// Rows visible in the window, and the idle scroll speed.
const VISIBLE_ROWS = 3;
const IDLE_SECONDS_PER_ROW = 2;

const EMPTY: ReelItem[] = [{ title: '· · ·', detail: '' }];

type Mode = 'idle' | 'spinning' | 'landed';

// A slot-machine reel, used for all three steps (a duty can have a hundred
// candidates, too many for a wheel's segments). While idle it slowly scrolls through
// `preview` (the possible outcomes); spinTo() spins and stops on the winner,
// which stays until the next spin or until `preview` changes.
@Component({
  selector: 'cdt-roulette-reel',
  templateUrl: './reel.component.html',
  styleUrls: ['./reel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReelComponent {
  readonly caption = input.required<string>();
  readonly preview = input<ReelItem[]>([]);

  readonly mode = signal<Mode>('idle');
  readonly rows = signal<ReelItem[]>([]);

  // The idle loop: the preview repeated to fill the window, then twice over
  // so the scroll can wrap without a jump.
  protected readonly idle = computed(() => {
    const items = this.preview().length > 0 ? this.preview() : EMPTY;
    const loop: ReelItem[] = [];
    while (loop.length < VISIBLE_ROWS || loop.length < items.length) {
      loop.push(...items);
    }
    return {
      rows: [...loop, ...loop],
      // Scroll by one loop's height; no scrolling for the placeholder.
      distance: `${loop.length * ROW_HEIGHT}px`,
      duration: `${loop.length * IDLE_SECONDS_PER_ROW}s`,
      moving: this.preview().length > VISIBLE_ROWS - 1,
    };
  });

  private readonly strip = viewChild<ElementRef<HTMLElement>>('strip');
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    // New possible outcomes replace a landed result with the idle preview.
    effect(() => {
      this.preview();
      untracked(() => {
        if (this.mode() === 'landed') this.mode.set('idle');
      });
    });
  }

  // Scrolls through random entries and stops on `winner`.
  async spinTo(items: ReelItem[], winner: ReelItem, random: () => number = Math.random) {
    const fillers = Array.from({ length: FILLER_ROWS }, () => items[Math.floor(random() * items.length)]);
    const after = items[Math.floor(random() * items.length)];
    // The winner sits in the middle row of the three visible ones.
    this.rows.set([...fillers, winner, after]);
    this.mode.set('spinning');
    this.cdr.detectChanges();

    const strip = this.strip()?.nativeElement;
    if (!strip) return;
    strip.style.transition = 'none';
    strip.style.transform = 'translateY(0)';
    strip.getBoundingClientRect();

    const duration = reducedMotion() ? 300 : 3600 + random() * 900;
    strip.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.75, 0.12, 1)`;
    strip.style.transform = `translateY(-${(FILLER_ROWS - 1) * ROW_HEIGHT}px)`;
    await wait(duration + 50);

    this.mode.set('landed');
  }
}
