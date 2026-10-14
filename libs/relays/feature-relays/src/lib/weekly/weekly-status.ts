import { WeeklyPost } from '@everise/core/api-types';
import { countdown, shortDateTime } from '../discord-times';

// What the Weekly tab says about the Fashion Report's days: open, coming,
// or over (until the next one is posted, with when judging opens again).
export function fashionReportStatus(report: WeeklyPost | null, nextJudgingAt: string, now: number): string {
  const next = Date.parse(nextJudgingAt);
  const opens = `Next judging opens ${shortDateTime(next)} (in ${countdown(next, now)}).`;
  if (!report) return `No Fashion Report yet. ${opens}`;
  const from = Date.parse(report.validFrom);
  const until = Date.parse(report.validUntil);
  if (now < from) return `For judging from ${shortDateTime(from)} to ${shortDateTime(until)}.`;
  if (now < until) return `Judging is open until ${shortDateTime(until)} (${countdown(until, now)} left).`;
  return `Judging closed ${shortDateTime(until)}. ${opens}`;
}

// The Island Sanctuary season's week, or that it's over.
export function islandSeasonStatus(season: WeeklyPost | null, now: number): string {
  if (!season) return "This week's recommendations aren't posted yet: they come just after the weekly reset.";
  const from = Date.parse(season.validFrom);
  const until = Date.parse(season.validUntil);
  if (now >= until) return `This season ended ${shortDateTime(until)}; the next one comes just after the reset.`;
  return `For the week from ${shortDateTime(from)} to ${shortDateTime(until)}.`;
}
