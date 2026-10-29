import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  HpCurve,
  HpPoint,
  TIER_NAMES,
  lowest,
  lowestPerBucket,
  pullClock,
  shareAt,
} from '@everise/planner/data-access';
import type { SeverityTier } from '@everise/planner/scheduler';
import { ButtonComponent, CheckboxComponent } from '@everise/ui/components';

// The plot's drawing box; the SVG stretches it to the panel's size.
const WIDTH = 1000;
const HEIGHT = 100;
// How far the arrow keys move the cursor, and Page Up/Down.
const STEP_MS = 1000;
const PAGE_MS = 10_000;
// The lines are drawn through their lowest HP in this many slices of the
// pull (a second each at least).
const SLICES = 500;

const percent = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 0 });

// The party's HP over the pull, a panel per member on one time axis: as
// played (grey) and with the plan (the accent), as shares of max HP, the
// margin a line across. Marks show a death as played, a hit the plan leaves
// short and a failed mechanic it takes as avoided; ticks under each plot,
// the boss attacks on them by tier (taller and darker the harder). Either line, and each
// member, can be hidden. A cursor shared by every panel (the pointer, or
// the arrow keys: the plot is a slider) says each member's HP then; without
// it, each panel says its lowest, so the chart reads without seeing it.
// Clicking a moment, or Enter at the cursor, picks it (`picked`: the
// timeline opens there). Below laptops only the `focused` member's panel
// shows, until everyone's is asked for.
@Component({
  selector: 'cdt-planner-hp-chart',
  templateUrl: './hp-chart.component.html',
  styleUrl: './hp-chart.component.scss',
  imports: [ButtonComponent, CheckboxComponent],
  host: { '[class.everyone]': 'everyone() || focused() === null' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HpChartComponent {
  readonly curves = input.required<HpCurve[]>();
  readonly durationMs = input.required<number>();
  // The HP each hit must leave, as a share of max HP.
  readonly margin = input(0);
  readonly picked = output<number>();
  // The member whose tab is open.
  readonly focused = input<number | null>(null);
  protected readonly everyone = signal(false);
  protected readonly focusedName = computed(() => this.curves().find((c) => c.id === this.focused())?.name ?? null);

  protected readonly showPlayed = signal(true);
  protected readonly showPlanned = signal(true);
  protected readonly showMp = signal(true);
  private readonly hidden = signal(new Set<number>());
  protected readonly at = signal<number | null>(null);
  protected readonly clock = pullClock;

  protected readonly planned = computed(() => this.curves().some((c) => c.planned));
  protected readonly withMp = computed(() => this.curves().some((c) => c.mp));
  protected readonly shown = computed(() => this.curves().filter((c) => !this.hidden().has(c.id)));
  protected readonly marginTop = computed(() => (1 - this.margin()) * 100);
  protected readonly marginLabel = computed(() => `${percent.format(this.margin())} margin`);
  // A tick every minute, or every two past ten minutes.
  protected readonly ticks = computed(() => {
    const minutes = this.durationMs() / 60_000;
    const every = minutes > 10 ? 2 : 1;
    const ticks: { label: string; left: number }[] = [];
    for (let m = 0; m <= minutes; m += every) ticks.push({ label: `${m}:00`, left: this.left(m * 60_000) });
    return ticks;
  });
  protected readonly cursorLeft = computed(() => {
    const at = this.at();
    return at === null ? null : this.left(at);
  });

  protected isShown(id: number) {
    return !this.hidden().has(id);
  }

  protected toggle(id: number) {
    const hidden = new Set(this.hidden());
    if (hidden.has(id)) hidden.delete(id);
    else hidden.add(id);
    this.hidden.set(hidden);
  }

  // A line through the HP's lowest in each slice of the pull: the dips that
  // matter, without each tick's jitter.
  protected path(points: HpPoint[]) {
    const duration = this.durationMs();
    const drawn = lowestPerBucket(points, duration, Math.max(1000, duration / SLICES));
    const x = (at: number) => ((at / duration) * WIDTH).toFixed(1);
    const y = (share: number) => ((1 - share) * HEIGHT).toFixed(1);
    return drawn.map((p, i) => `${i ? 'L' : 'M'}${x(p.at)} ${y(p.share)}`).join(' ');
  }

  protected left(at: number) {
    return Math.min(100, Math.max(0, (at / this.durationMs()) * 100));
  }

  // What a member's panel says: their HP at the cursor, or their lowest.
  protected readout(curve: HpCurve) {
    const at = this.at();
    const parts: string[] = [];
    const lines: [string, HpPoint[] | null, boolean][] = [
      ['played', curve.played, this.showPlayed()],
      ['plan', curve.planned, this.showPlanned()],
      ['MP', curve.mp, this.showMp()],
    ];
    for (const [name, points, show] of lines) {
      if (!points || !show) continue;
      if (at !== null) parts.push(`${name} ${percent.format(shareAt(points, at))}`);
      else {
        const low = lowest(points);
        if (low) parts.push(`${name} ${percent.format(low.share)} at ${pullClock(low.at)}`);
      }
    }
    if (!parts.length) return '';
    return at !== null ? `${pullClock(at)}: ${parts.join(', ')}` : `Lowest: ${parts.join(', ')}`;
  }

  protected markText(mark: HpCurve['marks'][number]) {
    const when = pullClock(mark.at);
    if (mark.kind === 'death') return `Died at ${when}, as played`;
    const attack = `${mark.action}${mark.tier ? ` (${TIER_NAMES[mark.tier]})` : ''}, ${when}`;
    if (mark.kind === 'avoided') return `${attack}: a failed mechanic, taken as avoided`;
    if (mark.kind === 'wipe') return `${attack}: a wipe nobody survives, not planned for`;
    return `${attack}: short with the plan, ${percent.format(mark.share)} left`;
  }

  protected hitText(hit: HpCurve['hits'][number]) {
    return `${hit.action}, ${pullClock(hit.at)}: ${TIER_NAMES[hit.tier]}`;
  }

  protected readonly TIERS: SeverityTier[] = ['light', 'moderate', 'heavy', 'lethal', 'overkill'];
  protected readonly TIER_NAMES = TIER_NAMES;

  protected point(event: PointerEvent) {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    this.at.set(Math.round(fraction * this.durationMs()));
  }

  protected pick() {
    const at = this.at();
    if (at !== null) this.picked.emit(at);
  }

  protected key(event: KeyboardEvent) {
    const at = this.at() ?? 0;
    if (event.key === 'Enter') {
      this.pick();
      return;
    }
    const moves: Record<string, number> = {
      ArrowRight: at + STEP_MS,
      ArrowLeft: at - STEP_MS,
      PageUp: at + PAGE_MS,
      PageDown: at - PAGE_MS,
      Home: 0,
      End: this.durationMs(),
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    this.at.set(Math.min(this.durationMs(), Math.max(0, moves[event.key])));
  }
}
