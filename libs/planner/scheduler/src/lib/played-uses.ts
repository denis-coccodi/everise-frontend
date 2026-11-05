import { PullTimeline } from '@everise/core/api-types';
import { MitigationTool, PlannedUse } from './plan.model';

// A mitigation or heal tool: whose, which action, and whom it goes on.
type PlayedTool = Pick<MitigationTool, 'player' | 'action' | 'name' | 'limitBreak'> & {
  effects: { target: string }[];
};

// How long after its cast a tank Limit Break's status lands (its
// animation), by level: measured in 34 ultimate kills.
const LIMIT_BREAK_LANDS_MS: Record<number, number> = { 197: 400, 198: 900 };
const LEVEL_3_LANDS_MS = 1_300;

// The uses of these tools as the pull has them, from when each landed (a
// cast bar's end, a Limit Break's animation), on the member it was used on:
// the actions of those the plan leaves as they played.
export function playedUses(timeline: PullTimeline, tools: PlayedTool[]): PlannedUse[] {
  const uses: PlannedUse[] = [];
  for (const cast of timeline.playerCasts) {
    const tool = tools.find((t) => t.player === cast.source && t.action === cast.action);
    if (!tool) continue;
    const targeted = tool.effects.some((e) => e.target === 'target');
    const lands = tool.limitBreak ? (LIMIT_BREAK_LANDS_MS[tool.action] ?? LEVEL_3_LANDS_MS) : 0;
    uses.push({
      player: tool.player,
      action: tool.action,
      name: tool.name,
      at: cast.at + (cast.castMs ?? 0) + lands,
      target: targeted ? (cast.target ?? tool.player) : null,
      covers: [],
    });
  }
  return uses;
}
