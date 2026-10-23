import { PullTimeline } from '@everise/core/api-types';
import type { Plan } from '@everise/planner/scheduler';
import type { PlanHitEntry, PlanUseEntry, PlanEntry } from './plan-log.model';

// One player's part of the plan, in time order: what to use when, and how
// each hit on them lands with the plan's mitigations, shields and heals.
export function planLog(plan: Plan, timeline: PullTimeline, playerId: number): PlanEntry[] {
  const mechanic = new Map(plan.mechanics.map((m) => [m.id, m]));
  const playerName = new Map(timeline.players.map((p) => [p.id, p.name]));
  const maxHp = timeline.players.find((p) => p.id === playerId)?.maxHp ?? null;
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
        absorbed: hit.absorbed,
        share: hit.share,
        before: maxHp && hit.hpBefore !== null ? hit.hpBefore / maxHp : null,
        // An invulnerability that lets the hit land (Holmgang) leaves 1 HP.
        after:
          maxHp && hit.hpBefore !== null
            ? Math.max(hit.invulnerable ? 1 : 0, hit.hpBefore - hit.planned) / maxHp
            : null,
        safe: hit.safe,
        avoidable: hit.avoidable,
        covers: hit.covers,
      };
    });
  const uses: PlanUseEntry[] = plan.uses
    .filter((use) => use.player === playerId)
    .map((use) => ({
      kind: 'use',
      at: use.at,
      action: use.name,
      target: use.target !== null && use.target !== playerId ? (playerName.get(use.target) ?? null) : null,
      covers: [...new Set(use.covers.map((id) => mechanic.get(id)?.name ?? 'Unknown'))],
      damage: use.damage ?? false,
    }));
  // A use comes before the hits it's for.
  return [...uses, ...hits].sort((a, b) => a.at - b.at);
}

// How many hits the plan leaves short of the margin.
export function unsafeHits(plan: Plan, playerId?: number) {
  return plan.hits.filter((hit) => !hit.safe && (playerId === undefined || hit.player === playerId)).length;
}
