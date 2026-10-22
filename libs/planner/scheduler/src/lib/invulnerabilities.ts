import { PullTimeline } from '@everise/core/api-types';
import { InvulnerabilityChoice, Mechanic, MitigationTool } from './plan.model';

// The tanks' invulnerabilities as the pull has them: each use, on the
// first mechanic that hit its user while it was up (one that covered
// none is left out). The group's strategy is in them: the mechanics one
// tank takes alone, or makes simpler for everyone.
export function playedInvulnerabilities(
  timeline: PullTimeline,
  mechanics: Mechanic[],
  tools: MitigationTool[],
): InvulnerabilityChoice[] {
  const choices: InvulnerabilityChoice[] = [];
  for (const cast of timeline.playerCasts) {
    const tool = tools.find((t) => t.player === cast.source && t.action === cast.action);
    const effect = tool?.effects.find((e) => e.invulnerable);
    if (!effect) continue;
    const from = cast.at + (cast.castMs ?? 0);
    const covered = mechanics
      .filter((m) => m.at >= from && m.at <= from + effect.durationMs && m.hits.some((h) => h.player === cast.source))
      .sort((a, b) => a.at - b.at)[0];
    if (covered) choices.push({ player: cast.source, action: cast.action, mechanic: covered.id });
  }
  return choices;
}
