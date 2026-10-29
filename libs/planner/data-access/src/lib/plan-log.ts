import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import { pressedFirst, attackSeverity, type Plan } from '@everise/planner/scheduler';
import { asPlayed } from './plan-as-played';
import type { PlanHitEntry, PlanUseEntry, PlanEntry } from './plan-log.model';

// One player's part of the plan, in time order: what to use when, and how
// each hit on them lands with the plan's mitigations, shields and heals.
// With the `catalog`, what they cast that the plan keeps as played too
// (`asPlayed`): their attacks, buffs, and all of it when not replanned.
export function planLog(plan: Plan, timeline: PullTimeline, playerId: number, catalog?: ActionCatalog): PlanEntry[] {
  const mechanic = new Map(plan.mechanics.map((m) => [m.id, m]));
  const playerName = new Map(timeline.players.map((p) => [p.id, p.name]));
  const catalogAction = new Map(catalog?.actions.map((a) => [a.id, a]));
  const maxHp = timeline.players.find((p) => p.id === playerId)?.maxHp ?? null;
  // As the pull's log has it, so both columns agree.
  const severity = attackSeverity(timeline);
  const hits: PlanHitEntry[] = plan.hits
    .filter((hit) => hit.player === playerId)
    .map((hit) => {
      const m = mechanic.get(hit.mechanic);
      return {
        kind: 'hit',
        at: m?.at ?? 0,
        action: m?.name ?? 'Unknown',
        severity: m ? severity(m.action, m.at) : null,
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
        ...(m?.wipe ? { wipe: true } : {}),
        ...(m?.hits.find((h) => h.player === hit.player)?.failed ? { failed: true } : {}),
        ...(m?.hits.find((h) => h.player === hit.player)?.estimated ? { estimated: true } : {}),
        covers: hit.covers,
      };
    });
  const uses: PlanUseEntry[] = plan.uses
    .filter((use) => use.player === playerId)
    .map((use) => ({
      kind: 'use',
      at: use.at,
      action: use.name,
      id: use.action,
      ...(use.edited ? { edited: true } : {}),
      ...(catalogAction.has(use.action)
        ? {
            icon: catalogAction.get(use.action)?.icon ?? null,
            description: catalogAction.get(use.action)?.description ?? null,
          }
        : {}),
      // Named even when it's themselves: a single-target heal or shield says
      // who it's for.
      target: use.target === null ? null : (playerName.get(use.target) ?? null),
      first: pressedFirst(use.action),
      covers: [...new Set(use.covers.map((id) => mechanic.get(id)?.name ?? 'Unknown'))],
      damage: use.damage ?? false,
      overcap: use.overcap ?? false,
      ...(use.opener ? { opener: true } : {}),
      ...(use.burst ? { burst: true } : {}),
      ...(use.refill ? { refill: true } : {}),
      ...(use.again ? { again: use.again } : {}),
      ...(catalogAction.get(use.action)?.gcd ? { gcd: true } : {}),
    }));
  // A use comes before the hits it's for.
  return [...uses, ...asPlayed(plan, timeline, playerId, catalog), ...hits].sort((a, b) => a.at - b.at);
}

// How many hits the plan leaves short of the margin.
export function unsafeHits(plan: Plan, playerId?: number) {
  return plan.hits.filter((hit) => !hit.safe && (playerId === undefined || hit.player === playerId)).length;
}
