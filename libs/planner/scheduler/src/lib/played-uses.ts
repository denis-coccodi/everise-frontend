import { PullTimeline } from '@everise/core/api-types';
import { MitigationTool, PlannedUse } from './plan.model';

// The uses of these tools as the pull has them, from when each landed (a
// cast bar's end), on the member it was used on: the actions of those the
// plan leaves as they played.
export function playedUses(timeline: PullTimeline, tools: MitigationTool[]): PlannedUse[] {
  const uses: PlannedUse[] = [];
  for (const cast of timeline.playerCasts) {
    const tool = tools.find((t) => t.player === cast.source && t.action === cast.action);
    if (!tool) continue;
    const targeted = tool.effects.some((e) => e.target === 'target');
    uses.push({
      player: tool.player,
      action: tool.action,
      name: tool.name,
      at: cast.at + (cast.castMs ?? 0),
      target: targeted ? (cast.target ?? tool.player) : null,
      covers: [],
    });
  }
  return uses;
}
