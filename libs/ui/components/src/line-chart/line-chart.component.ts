import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { fullNumber, longDay, timeFraction, timeTicks, valueAxis, valueFraction } from './chart-scales';
import type { ChartScale, ChartPoint, ChartLine } from './line-chart.model';
// The plot's drawing box; the SVG stretches it to the chart's size.
const WIDTH = 1000;
const HEIGHT = 400;
// Lines with this many points or fewer show each point as a dot.
const DOTS_UP_TO = 40;

// A time series chart: up to eight lines over the days from `from` to `to`
// (ms), told apart by colour and dash, values on a linear or log axis. A
// line breaks where two of its points are more than `gap` (ms) apart (a
// day without sales), and a point alone between breaks shows as a dot.
// A cursor marks one day; the pointer or the arrow keys move it (the plot is
// a slider, Home/End and Page Up/Down too), and the line above the plot says
// each line's value that day. The legend says each line's latest, lowest
// and highest value, so the chart reads without seeing it.
// <cdt-line-chart [lines]="…" [from]="…" [to]="…" label="Day" unit="gil" />
@Component({
  selector: 'cdt-line-chart',
  templateUrl: './line-chart.component.html',
  styleUrl: './line-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineChartComponent {
  readonly lines = input.required<ChartLine[]>();
  readonly from = input.required<number>();
  readonly to = input.required<number>();
  readonly scale = input<ChartScale>('linear');
  // The slider's name, e.g. "Day shown".
  readonly label = input.required<string>();
  // What the values count, after each one ("gil").
  readonly unit = input('');
  // Points further apart than this (ms) break the line; by default none do.
  readonly gap = input(Infinity);
  // What the cursor says for a line without a point that day.
  readonly missing = input('no value');

  // The day the cursor is on (an index into `days`); null: the last day.
  private readonly picked = signal<number | null>(null);

  // Every day some line has a point on, in order.
  protected readonly days = computed(() =>
    [...new Set(this.lines().flatMap((line) => line.points.map((point) => point.at)))].sort((a, b) => a - b),
  );
  protected readonly index = computed(() => {
    const last = this.days().length - 1;
    return Math.min(this.picked() ?? last, last);
  });
  protected readonly at = computed(() => this.days()[this.index()] ?? null);

  protected readonly axis = computed(() => {
    const values = this.lines().flatMap((line) => line.points.map((point) => point.value));
    return values.length
      ? valueAxis(Math.min(...values), Math.max(...values), this.scale())
      : valueAxis(0, 1, this.scale());
  });
  protected readonly yTicks = computed(() =>
    this.axis().ticks.map((tick) => ({ label: tick.label, top: (1 - valueFraction(tick.value, this.axis())) * 100 })),
  );
  protected readonly xTicks = computed(() =>
    timeTicks(this.from(), this.to()).map((tick) => ({ label: tick.label, left: this.left(tick.value) })),
  );
  // Each line's unbroken runs of points.
  private readonly runs = computed(() =>
    this.lines().map((line) => {
      const runs: ChartPoint[][] = [];
      line.points.forEach((point, i) => {
        if (i === 0 || point.at - line.points[i - 1].at > this.gap()) runs.push([point]);
        else runs[runs.length - 1].push(point);
      });
      return runs;
    }),
  );
  protected readonly paths = computed(() =>
    this.runs().flatMap((runs, line) =>
      runs
        .filter((run) => run.length > 1)
        .map((run) => ({
          line,
          points: run
            .map((point) => `${(this.left(point.at) * WIDTH) / 100},${(this.top(point.value) * HEIGHT) / 100}`)
            .join(' '),
        })),
    ),
  );
  // The points of lines with few of them, and points alone, as dots.
  protected readonly dots = computed(() =>
    this.runs().flatMap((runs, line) =>
      runs
        .filter((run) => run.length === 1 || this.lines()[line].points.length <= DOTS_UP_TO)
        .flat()
        .map((point) => ({ line, left: this.left(point.at), top: this.top(point.value) })),
    ),
  );

  // Each line's point on the cursor's day, if it has one.
  protected readonly cursor = computed(() => {
    const at = this.at();
    if (at === null) return null;
    return {
      date: longDay.format(at),
      left: this.left(at),
      values: this.lines().map((line, i) => {
        const point = line.points.find((p) => p.at === at);
        return {
          line: i,
          name: line.name,
          text: point ? this.valueText(point) : this.missing(),
          top: point ? this.top(point.value) : null,
        };
      }),
    };
  });
  protected readonly cursorText = computed(() => {
    const cursor = this.cursor();
    return cursor ? `${cursor.date}: ${cursor.values.map((v) => `${v.name} ${v.text}`).join('; ')}` : '';
  });

  // Each line's latest, lowest and highest value.
  protected readonly summaries = computed(() =>
    this.lines().map((line) => {
      if (!line.points.length) return 'nothing in these days';
      const values = line.points.map((point) => point.value);
      return (
        `latest ${this.amount(line.points[line.points.length - 1].value)}, ` +
        `low ${this.amount(Math.min(...values))}, high ${this.amount(Math.max(...values))}`
      );
    }),
  );

  protected onKey(event: KeyboardEvent) {
    const last = this.days().length - 1;
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, PageUp: -30, PageDown: 30 };
    let next: number;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else if (event.key in moves) next = this.index() + moves[event.key];
    else return;
    event.preventDefault();
    this.picked.set(Math.max(0, Math.min(last, next)));
  }

  // The day nearest the pointer.
  protected onPointer(event: PointerEvent) {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!box.width || !this.days().length) return;
    const at = this.from() + ((event.clientX - box.left) / box.width) * (this.to() - this.from());
    let nearest = 0;
    this.days().forEach((day, i) => {
      if (Math.abs(day - at) < Math.abs(this.days()[nearest] - at)) nearest = i;
    });
    this.picked.set(nearest);
  }

  private left(at: number) {
    return timeFraction(at, this.from(), this.to()) * 100;
  }

  private top(value: number) {
    return (1 - valueFraction(value, this.axis())) * 100;
  }

  private amount(value: number) {
    return `${fullNumber.format(value)}${this.unit() ? ` ${this.unit()}` : ''}`;
  }

  private valueText(point: ChartPoint) {
    return `${this.amount(point.value)}${point.detail ? ` (${point.detail})` : ''}`;
  }
}
