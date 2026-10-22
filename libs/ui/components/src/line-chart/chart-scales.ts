import type { Tick, ValueAxis, ChartScale } from './line-chart.model';

// The line chart's arithmetic: where values and times fall, and which round
// numbers and dates mark its axes.

const DAY = 86_400_000;
// Short numbers for the axis: 950, 12K, 1.5M.
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
export const fullNumber = new Intl.NumberFormat('en');

// A round step near `span / count`: 1, 2 or 5 times a power of ten.
function niceStep(span: number, count: number) {
  const raw = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
}

// The axis for values from `low` to `high`: round ends and about `count`
// marks between them. On a log scale, marks at 1, 2 and 5 times powers of
// ten (only powers of ten when there are many of them).
export function valueAxis(low: number, high: number, scale: ChartScale, count = 5): ValueAxis {
  if (scale === 'log') {
    const min = 10 ** Math.floor(Math.log10(Math.max(1, low)));
    const max = 10 ** Math.ceil(Math.log10(Math.max(min * 10, high)));
    const decades = Math.round(Math.log10(max / min));
    const steps = decades > 3 ? [1] : [1, 2, 5];
    const ticks: Tick[] = [];
    for (let power = min; power <= max; power *= 10) {
      for (const step of steps) {
        const value = power * step;
        if (value <= max) ticks.push({ value, label: compact.format(value) });
      }
    }
    return { min, max, scale, ticks };
  }
  const span = high - low || Math.max(1, Math.abs(high) * 0.1);
  const step = niceStep(span, count);
  const min = Math.max(0, Math.floor((low === high ? low - span / 2 : low) / step) * step);
  const max = Math.ceil((low === high ? high + span / 2 : high) / step) * step || step;
  const ticks: Tick[] = [];
  for (let value = min; value <= max + step / 2; value += step) {
    ticks.push({ value, label: compact.format(value) });
  }
  return { min, max, scale, ticks };
}

// Where a value falls on its axis, from 0 (bottom) to 1 (top).
export function valueFraction(value: number, axis: ValueAxis) {
  if (axis.scale === 'log') {
    const log = (v: number) => Math.log10(Math.max(axis.min, v));
    return (log(value) - log(axis.min)) / (log(axis.max) - log(axis.min));
  }
  return (value - axis.min) / (axis.max - axis.min || 1);
}

// Where a time falls between `from` and `to`, from 0 (left) to 1 (right).
export function timeFraction(at: number, from: number, to: number) {
  return to > from ? (at - from) / (to - from) : 0.5;
}

const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const month = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' });
const monthYear = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const year = new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone: 'UTC' });
export const longDay = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

// Dates to mark between `from` and `to` (ms, UTC days), at most about
// `count`: days or weeks for short ranges, months for longer, years for the
// longest.
export function timeTicks(from: number, to: number, count = 6): Tick[] {
  const days = (to - from) / DAY;
  const ticks: Tick[] = [];
  if (days <= count * 7) {
    const step = Math.max(1, Math.ceil(days / count)) * DAY;
    for (let at = from; at <= to; at += step) ticks.push({ value: at, label: dayMonth.format(at) });
    return ticks;
  }
  const months = days / 30.4;
  if (months > count * 6) {
    const every = Math.max(1, Math.ceil(months / 12 / count));
    for (let y = new Date(from).getUTCFullYear() + 1; ; y += every) {
      const at = Date.UTC(y, 0, 1);
      if (at > to) break;
      ticks.push({ value: at, label: year.format(at) });
    }
    return ticks;
  }
  // Months, on the year's own quarters or halves when they're many; the
  // year with January and the first mark.
  const every = [1, 2, 3, 6].find((n) => months / n <= count) ?? 12;
  const start = new Date(from);
  for (let m = start.getUTCMonth() + 1; ; m++) {
    const at = Date.UTC(start.getUTCFullYear(), m, 1);
    if (at > to) break;
    const january = new Date(at).getUTCMonth() === 0;
    if (new Date(at).getUTCMonth() % every === 0) {
      ticks.push({ value: at, label: january || !ticks.length ? monthYear.format(at) : month.format(at) });
    }
  }
  return ticks;
}
