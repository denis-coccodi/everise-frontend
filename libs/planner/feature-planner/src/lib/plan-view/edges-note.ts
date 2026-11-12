import { pullClock } from '@everise/planner/data-access';
import type { Plan } from '@everise/planner/scheduler';

type PlannedMp = NonNullable<Plan['mp']>[number];

// A Dark Knight's Edges of Shadow against the log: those more than played
// their MP pays for with the plan, those as played it drops for The
// Blackest Night's MP, and the difference.
export function edgesNote(mp: PlannedMp | undefined): string {
  const [gained, lost] = [mp?.gained ?? [], mp?.dropped ?? []];
  if (!gained.length && !lost.length) return '';
  const more = `the plan's MP pays for ${gained.length} more than played`;
  const ones = lost.length === 1 ? 'the one' : 'the ones';
  const less = `drops ${ones} at ${lost.map(pullClock).join(', ')} for The Blackest Night's MP`;
  if (!lost.length) return `Edges of Shadow: ${more}.`;
  if (!gained.length) return `Edges of Shadow: the plan ${less}.`;
  const net = gained.length - lost.length;
  const all = net === 0 ? 'as many as played' : `${Math.abs(net)} ${net > 0 ? 'more' : 'fewer'}`;
  return `Edges of Shadow: ${more}, and it ${less}: ${all} in all.`;
}
