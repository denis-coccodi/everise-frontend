import { ActionCatalog, CatalogAction, PullTimeline } from '@everise/core/api-types';
import type { Plan, PlannedUse } from '@everise/planner/scheduler';
import { dealsDamage, onlyDamage, whatItDoes } from './action-kinds';
import { effectsText } from './effect-text';
import type { PlanUseEntry } from './plan-log.model';
import { countdownStart } from './pull-time';

// A replanned player's buffs and enablers the plan leaves as they played
// them (Lucid Dreaming, a raid buff, a potion): not a heal or mitigation
// (the plan's are its own), nor one the plan uses itself close by (an
// opener's Chain Stratagem) or on cooldown (its burst), nor one it plans for
// them (Synastry, Recitation): theirs gave up its slot.
const SAME_USE_MS = 10_000;
// A Lightspeed of theirs this far from the plan's is their second charge,
// for movement: kept as played.
const LIGHTSPEED = 3606;
const SECOND_CHARGE_MS = 20_000;
// Eukrasia: before a Eukrasian heal the plan's own says so ("Eukrasia, then");
// before Eukrasian Dosis it's the rotation's damage.
const EUKRASIA = 24290;
// A planned GCD this close to one of theirs took its slot.
const SAME_GCD_MS = 600;
// A use of the plan's this close to a cast of a player planned as they
// played is that cast.
const SAME_CAST_MS = 2_500;

// What the player cast that the plan keeps as they played it, so that both
// columns show their whole rotation. A player planned as they played keeps
// everything the plan doesn't list itself (their heals, buffs, attacks). A
// replanned one keeps their attacks, but for the GCDs a planned one took the
// slot of; where they cast a GCD heal the plan has no use for, it's their
// usual damage GCD instead; and their buffs and enablers as above.
export function asPlayed(plan: Plan, timeline: PullTimeline, playerId: number, catalog?: ActionCatalog) {
  if (!catalog) return [];
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const names = new Map(timeline.actions.map((a) => [a.id, a.name]));
  const mine = plan.uses.filter((u) => u.player === playerId);
  const casts = timeline.playerCasts.filter((c) => c.source === playerId).sort((a, b) => a.at - b.at);
  const replanned = !plan.replanned || plan.replanned.includes(playerId);
  const plannedGcds = mine.filter((u) => byId.get(u.action)?.gcd).map((u) => u.at);
  const slotTaken = (at: number) => plannedGcds.some((t) => Math.abs(t - at) < SAME_GCD_MS);
  const filler = usualAttack(casts, byId);
  const entry = (c: (typeof casts)[number], action: CatalogAction | undefined, kept: string): PlanUseEntry => ({
    kind: 'use',
    at: c.at,
    action: action?.name ?? names.get(c.action) ?? '',
    icon: action?.icon ?? null,
    description: action?.description ?? null,
    target: null,
    covers: [],
    damage: false,
    overcap: false,
    kept,
    ...(action?.gcd ? { gcd: true } : {}),
  });
  // The plan's opener has its own steps, attacks too: theirs give way.
  const openerEnd = Math.max(-Infinity, ...mine.filter((u) => u.opener).map((u) => u.at + SAME_GCD_MS));
  const out: PlanUseEntry[] = [];
  const scheduled = new Set(plan.scheduled ?? []);
  casts.forEach((c, i) => {
    const action = byId.get(c.action);
    // An attack that heals too stays as played (Confiteor), but for an oGCD
    // the plan places itself (Assize).
    const attack =
      onlyDamage(c.action, action) ||
      (c.action === EUKRASIA && isAttack(casts[i + 1], byId)) ||
      (dealsDamage(action) && (!!action?.gcd || !scheduled.has(playerId + ':' + c.action)));
    const castAt = action ? countdownStart(c.at, c.castMs, action.castMs) : null;
    const begun = castAt !== null ? { castAt } : {};
    if (mine.some((u) => u.action === c.action && Math.abs(u.at - c.at) < SAME_CAST_MS)) return;
    if (!replanned) {
      const does = attack
        ? 'Damage'
        : action?.effects.length
          ? effectsText(action.effects)
          : whatItDoes(c.action, action);
      out.push({ ...entry(c, action, does), ...(attack ? { attack: true } : {}), ...begun });
    } else if (attack) {
      if (c.at <= openerEnd || (action?.gcd && slotTaken(c.at))) return;
      out.push({ ...entry(c, action, 'Damage'), attack: true, ...begun });
    } else if (action?.gcd && action.effects.length) {
      // A GCD heal of theirs the plan has no use for: damage there instead.
      if (c.at <= openerEnd || slotTaken(c.at) || !filler) return;
      out.push({ ...entry(c, filler, 'Damage'), attack: true, instead: action.name });
    } else if (c.action !== EUKRASIA && !action?.effects.length && keptBuff(plan, mine, playerId, c)) {
      out.push(entry(c, action, whatItDoes(c.action, action)));
    }
  });
  return out;
}

// Whether a buff or enabler of theirs stays as played (see SAME_USE_MS).
function keptBuff(plan: Plan, mine: PlannedUse[], playerId: number, c: { action: number; at: number }) {
  // What the plan schedules for them gave up its slot, but for a
  // Lightspeed's second charge.
  if (c.action !== LIGHTSPEED && plan.scheduled?.includes(playerId + ':' + c.action)) return false;
  const near = (u: PlannedUse) => Math.abs(u.at - c.at) < (c.action === LIGHTSPEED ? SECOND_CHARGE_MS : SAME_USE_MS);
  return !mine.some((u) => u.action === c.action && (near(u) || (c.action !== LIGHTSPEED && (u.burst || u.refill))));
}

const isAttack = (cast: { action: number } | undefined, byId: Map<number, CatalogAction>) =>
  !!cast && onlyDamage(cast.action, byId.get(cast.action));

// The damage GCD they cast most: what they'd cast in a slot the plan frees.
function usualAttack(casts: { action: number }[], byId: Map<number, CatalogAction>) {
  const counts = new Map<number, number>();
  for (const c of casts) {
    const action = byId.get(c.action);
    if (action?.gcd && onlyDamage(c.action, action)) counts.set(c.action, (counts.get(c.action) ?? 0) + 1);
  }
  const best = [...counts].sort((a, b) => b[1] - a[1])[0];
  return best ? byId.get(best[0]) : undefined;
}
