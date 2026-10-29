import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import { landedGcds, pressedFirst, attackSeverity, type Plan, type PlannedUse } from '@everise/planner/scheduler';
import { onlyDamage, whatItDoes } from './action-kinds';
import { countdownStart } from './pull-time';
import type { PlanGcdEntry, PlanHitEntry, PlanUseEntry, PlanEntry } from './plan-log.model';

// One player's part of the plan, in time order: what to use when, and how
// each hit on them lands with the plan's mitigations, shields and heals.
// With the `catalog`, each oGCD shows the GCD of theirs it's woven after: a
// damage GCD as played, where the plan has none of its own.
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
  const asPlayed = kept(plan, timeline, playerId, catalog);
  // A use comes before the hits it's for.
  return [...damageGcds(plan, timeline, playerId, catalog, asPlayed), ...uses, ...asPlayed, ...hits].sort(
    (a, b) => a.at - b.at,
  );
}

// A replanned player's buffs and enablers the plan leaves as they played
// them (Lucid Dreaming, a raid buff, a potion): not their attacks, nor a
// heal or mitigation (the plan's are its own), nor one the plan uses itself
// close by (an opener's Chain Stratagem) or on cooldown (its burst), nor one
// it plans for them (Synastry, Recitation): theirs gave up its slot.
const SAME_USE_MS = 10_000;
// A Lightspeed of theirs this far from the plan's is their second charge,
// for movement: kept as played.
const LIGHTSPEED = 3606;
const SECOND_CHARGE_MS = 20_000;
// Eukrasia: before a Eukrasian heal the plan's own says so ("Eukrasia, then"),
// before Eukrasian Dosis it's the rotation's damage.
const EUKRASIA = 24290;
function kept(plan: Plan, timeline: PullTimeline, playerId: number, catalog?: ActionCatalog): PlanUseEntry[] {
  if (!catalog || !plan.replanned?.includes(playerId)) return [];
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const names = new Map(timeline.actions.map((a) => [a.id, a.name]));
  const mine = plan.uses.filter((u) => u.player === playerId);
  return timeline.playerCasts
    .filter((c) => {
      const action = byId.get(c.action);
      if (c.source !== playerId || c.action === EUKRASIA || onlyDamage(c.action, action) || action?.effects.length)
        return false;
      // What the plan schedules for them gave up its slot, but for a
      // Lightspeed's second charge.
      if (c.action !== LIGHTSPEED && plan.scheduled?.includes(playerId + ':' + c.action)) return false;
      const near = (u: PlannedUse) =>
        Math.abs(u.at - c.at) < (c.action === LIGHTSPEED ? SECOND_CHARGE_MS : SAME_USE_MS);
      return !mine.some(
        (u) => u.action === c.action && (near(u) || (c.action !== LIGHTSPEED && (u.burst || u.refill))),
      );
    })
    .map((c) => {
      const action = byId.get(c.action);
      return {
        kind: 'use',
        at: c.at,
        action: action?.name ?? names.get(c.action) ?? '',
        icon: action?.icon ?? null,
        description: action?.description ?? null,
        target: null,
        covers: [],
        damage: false,
        overcap: false,
        kept: whatItDoes(c.action, action),
        ...(action?.gcd ? { gcd: true } : {}),
      };
    });
}

// The player's GCDs as played that the plan's oGCDs are woven after (and
// the ones `asPlayed` keeps), where the plan has no GCD of its own there,
// and their first if it was cast in the countdown.
function damageGcds(
  plan: Plan,
  timeline: PullTimeline,
  playerId: number,
  catalog?: ActionCatalog,
  asPlayed: PlanUseEntry[] = [],
): PlanGcdEntry[] {
  if (!catalog) return [];
  const gcd = new Map(catalog.actions.map((a) => [a.id, a.gcd]));
  const casts = timeline.playerCasts
    .filter((c) => c.source === playerId && gcd.get(c.action))
    .sort((a, b) => a.at - b.at);
  const played = casts.map((c) => c.at);
  const prepull = landedGcds(casts).includes(0) ? played[0] : null;
  const castMs = catalog.actions.find((a) => a.id === casts[0]?.action)?.castMs ?? 0;
  const mine = plan.uses.filter((u) => u.player === playerId);
  const planned = new Set(mine.filter((u) => gcd.get(u.action)).map((u) => u.at));
  const after = new Set<number>();
  const ogcds = [...mine.filter((u) => gcd.get(u.action) === false), ...asPlayed.filter((u) => !u.gcd)].map(
    (u) => u.at,
  );
  for (const at of ogcds) {
    const before = played.filter((t) => t <= at).at(-1);
    if (before !== undefined && !planned.has(before)) after.add(before);
  }
  if (prepull !== null && !planned.has(prepull)) after.add(prepull);
  return [...after]
    .sort((a, b) => a - b)
    .map((at) => ({
      kind: 'gcd',
      at,
      prepull: at === prepull,
      castAt: at === prepull ? countdownStart(at, casts[0].castMs, castMs) : null,
    }));
}

// How many hits the plan leaves short of the margin.
export function unsafeHits(plan: Plan, playerId?: number) {
  return plan.hits.filter((hit) => !hit.safe && (playerId === undefined || hit.player === playerId)).length;
}
