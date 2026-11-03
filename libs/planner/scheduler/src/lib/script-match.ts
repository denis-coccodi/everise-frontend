import type { FightScript, PullTimeline } from '@everise/core/api-types';

// The share of a log's distinct enemy casts a script must know for it to
// be the fight's. On real pulls the fight's own script knew 69-100% of
// them and another fight's none, so this sits well between.
export const MIN_SCRIPT_MATCH = 0.5;
const AUTO_ATTACK = /^attack$/i;

// Whether `script` is the fight `timeline` logs: most of the enemies'
// distinct casts (auto-attacks aside) are among its mechanics' or the ones
// it leaves out. A log without casts can't tell, so it doesn't match.
export function scriptMatches(timeline: PullTimeline, script: FightScript): boolean {
  const names = new Map(timeline.actions.map((a) => [a.id, a.name]));
  const cast = new Set(timeline.enemyCasts.map((c) => c.action).filter((id) => !AUTO_ATTACK.test(names.get(id) ?? '')));
  if (!cast.size) return false;
  const known = new Set([...script.mechanics.flatMap((m) => m.ids), ...script.ignoredIds]);
  const matched = [...cast].filter((id) => known.has(id)).length;
  return matched / cast.size >= MIN_SCRIPT_MATCH;
}
