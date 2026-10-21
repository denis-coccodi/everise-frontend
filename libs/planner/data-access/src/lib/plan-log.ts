import { PullTimeline } from '@everise/core/api-types';
import type { Plan } from '@everise/planner/scheduler';

// A hit as the plan leaves it.
export interface PlanHitEntry {
  kind: 'hit';
  at: number;
  action: string;
  unmitigated: number;
  planned: number;
  asPlayed: number;
  // The planned damage as a share of their max HP.
  share: number | null;
  safe: boolean;
  covers: string[];
}

// A mitigation the plan has the player use.
export interface PlanUseEntry {
  kind: 'use';
  at: number;
  action: string;
  // The party member it goes on, when it goes on one.
  target: string | null;
  // The mechanics it covers.
  covers: string[];
}

export type PlanEntry = PlanHitEntry | PlanUseEntry;

// One player's part of the plan, in time order: what to use when, and how
// each hit on them lands with the plan's mitigations up.
export function planLog(plan: Plan, timeline: PullTimeline, playerId: number): PlanEntry[] {
  const mechanic = new Map(plan.mechanics.map((m) => [m.id, m]));
  const playerName = new Map(timeline.players.map((p) => [p.id, p.name]));
  const hits: PlanHitEntry[] = plan.hits
    .filter((hit) => hit.player === playerId)
    .map((hit) => {
      const m = mechanic.get(hit.mechanic);
      return {
        kind: 'hit',
        at: m?.at ?? 0,
        action: m?.name ?? 'Unknown',
        unmitigated: hit.unmitigated,
        planned: hit.planned,
        asPlayed: hit.asPlayed,
        share: hit.share,
        safe: hit.safe,
        covers: hit.covers,
      };
    });
  const uses: PlanUseEntry[] = plan.uses
    .filter((use) => use.player === playerId)
    .map((use) => ({
      kind: 'use',
      at: use.at,
      action: use.name,
      target: use.target !== null && use.target !== playerId ? playerName.get(use.target) ?? null : null,
      covers: [...new Set(use.covers.map((id) => mechanic.get(id)?.name ?? 'Unknown'))],
    }));
  // A use comes before the hits it's for.
  return [...uses, ...hits].sort((a, b) => a.at - b.at);
}

// How many hits the plan leaves short of the margin.
export function unsafeHits(plan: Plan, playerId?: number) {
  return plan.hits.filter((hit) => !hit.safe && (playerId === undefined || hit.player === playerId)).length;
}
