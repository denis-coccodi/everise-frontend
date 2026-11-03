import type { ReportPull } from '@everise/core/api-types';

// How many of them are read, at most.
const MAX_FURTHER = 3;

// The report's pulls of the same fight as `pullId` that got further than
// it, furthest first: its kills, then the wipes with less of the fight
// left. What completes a wipe when no other group's kill can be read.
export function furtherPulls(pulls: ReportPull[], pullId: number): ReportPull[] {
  const pull = pulls.find((p) => p.id === pullId);
  if (!pull) return [];
  const left = (p: ReportPull) => (p.kill ? 0 : (p.fightLeft ?? Infinity));
  return pulls
    .filter((p) => p.encounterId === pull.encounterId && p.id !== pullId && left(p) < left(pull))
    .sort((a, b) => left(a) - left(b) || b.durationMs - a.durationMs)
    .slice(0, MAX_FURTHER);
}
