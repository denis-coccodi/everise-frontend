import { PullTimeline } from '@everise/core/api-types';
import { InvulnerabilityChoice, InvulnerabilityOptions, Mechanic, MitigationTool } from './plan.model';
import { mechanicsOf } from './mechanics';

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

// What the plan's options offer for the tanks' invulnerabilities, from
// everyone's mitigation `tools`.
export function invulnerabilityOptions(timeline: PullTimeline, tools: MitigationTool[]): InvulnerabilityOptions {
  const invulnerable = tools.filter((t) => t.effects.some((e) => e.invulnerable));
  const mechanics = mechanicsOf(timeline);
  return {
    tools: invulnerable.map(({ player, action, name }) => ({ player, action, name })),
    mechanics: mechanics.map((m) => ({ id: m.id, at: m.at, name: m.name, players: m.hits.map((h) => h.player) })),
    played: playedInvulnerabilities(timeline, mechanics, invulnerable),
  };
}
