import { ActionCatalog, CatalogAction, PullTimeline } from '@everise/core/api-types';
import {
  FOLLOW_UPS,
  drainsWithStacks,
  gcdCasts,
  withoutFollowUps,
  type Plan,
  type PlannedUse,
} from '@everise/planner/scheduler';
import { dealsDamage, onlyDamage, whatItDoes } from './action-kinds';
import { effectsText } from './effect-text';
import type { PlanUseEntry } from './plan-log.model';
import { countdownStart } from './pull-time';
import { withCombosKept } from './plan-combos';
import { withGaugePaid } from './plan-gauges';
import { withStingsPaid } from './plan-stings';

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
// An oGCD of the plan's this close to one of theirs took its weave slot (the next one is 0.7s on).
const SAME_WEAVE_MS = 350;
// A use of the plan's this close to a cast of a player planned as they
// played is that cast.
const SAME_CAST_MS = 2_500;
const ENERGY_DRAIN = 167;

// What the player cast that the plan keeps as they played it, so that both
// columns show their whole rotation. A player planned as they played keeps
// everything the plan doesn't list itself (their heals, buffs, attacks). A
// replanned one keeps their attacks, but for the GCDs a planned one took the
// slot of, a scholar's Energy Drains whose stacks the plan's heals took, and
// what their burst enabled that the plan's, moved, doesn't (their usual GCD in
// its place); where they cast a GCD heal the plan has no use for, it's their
// usual damage GCD instead; and their buffs and enablers as above.
export function asPlayed(plan: Plan, timeline: PullTimeline, playerId: number, catalog?: ActionCatalog) {
  if (!catalog) return [];
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const names = new Map(timeline.actions.map((a) => [a.id, a.name]));
  const mine = plan.uses.filter((u) => u.player === playerId);
  // Their presses: not the follow-ups the log has of a GCD (Pneuma's heal).
  const casts = withoutFollowUps(
    timeline.playerCasts.filter((c) => c.source === playerId),
    catalog,
  );
  const replanned = !plan.replanned || plan.replanned.includes(playerId);
  const plannedGcds = mine.filter((u) => byId.get(u.action)?.gcd).map((u) => u.at);
  const slotTaken = (at: number) => plannedGcds.some((t) => Math.abs(t - at) < SAME_GCD_MS);
  const filler = usualAttack(casts, byId);
  const gcd = gcdCasts(casts, byId);
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
    ...(gcd(c) ? { gcd: true } : {}),
  });
  // The plan's opener has its own oGCD steps: their oGCD attacks in it give way to one of the same (an Energy Drain)
  // or in its slot; the rest stay (a paladin's Imperator, which their Confiteor needs).
  const openerSteps = mine.filter((u) => u.opener);
  const openerEnd = Math.max(-Infinity, ...openerSteps.map((u) => u.at + SAME_GCD_MS));
  const givesWay = (c: { action: number; at: number }) =>
    c.at <= openerEnd && openerSteps.some((u) => u.action === c.action || Math.abs(u.at - c.at) < SAME_WEAVE_MS);
  // The GCD attacks the plan places for them itself (Afflatus Misery): theirs give way, their usual attack there.
  const ownAttacks = new Set(
    mine.filter((u) => u.damage || (u.opener && byId.get(u.action)?.gcd)).map((u) => u.action),
  );
  // Whether the Eukrasia before a Eukrasian attack of theirs (`i`) still shows: one a planned GCD took the slot of
  // leaves it a plain Dosis.
  const eukrasiaShown = (i: number) => {
    const e = casts
      .slice(0, i)
      .reverse()
      .find((x) => x.action === EUKRASIA);
    return !!e && out.some((o) => o.at === e.at && o.action === (byId.get(EUKRASIA)?.name ?? 'Eukrasia'));
  };
  // A replanned scholar's Energy Drains where the plan's heals left the stacks.
  const drains = new Set(
    replanned
      ? drainsWithStacks(
          mine,
          casts.filter((c) => c.action === ENERGY_DRAIN && c.at > openerEnd),
        )
      : [],
  );
  const out: PlanUseEntry[] = [];
  const scheduled = new Set(plan.scheduled ?? []);
  // What the plan places for them, by name too: the log has another action for
  // some of them (Horoscope read again, Pneuma's heal).
  const placedNames = new Set<string | undefined>(
    [...scheduled].filter((k) => k.startsWith(playerId + ':')).map((k) => byId.get(Number(k.split(':')[1]))?.name),
  );
  placedNames.delete(undefined);
  casts.forEach((c, i) => {
    const action = byId.get(c.action);
    // An attack stays as played (one that heals too: Confiteor), but for one
    // the plan places itself (Assize, Lord of Crowns; Macrocosmos, a GCD: their
    // usual attack in its slot instead).
    const placed = scheduled.has(playerId + ':' + c.action) || placedNames.has(action?.name ?? names.get(c.action));
    // An oGCD the plan places itself is the plan's alone (but a Lightspeed's other charge, for movement).
    if (placed && !action?.gcd && c.action !== LIGHTSPEED && replanned) return;
    const attack =
      !placed &&
      (onlyDamage(c.action, action) || (c.action === EUKRASIA && isAttack(casts[i + 1], byId)) || dealsDamage(action));
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
      // The opener's steps are oGCDs: in it their oGCD attacks give way, not
      // their GCDs.
      if (gcd(c) ? slotTaken(c.at) : givesWay(c)) return;
      if (c.action === ENERGY_DRAIN && !drains.has(c)) return;
      // One their burst enabled that the plan's, moved, doesn't (it keeps those it does, `followUpUses`), one the plan
      // places itself, or a Eukrasian attack whose Eukrasia is gone: their usual attack in its place; an oGCD (Oracle,
      // Baneful Impaction) gives up its slot.
      const eukrasian = !!action?.name.startsWith('Eukrasian D') && !eukrasiaShown(i);
      if (FOLLOW_UPS.has(c.action) || ownAttacks.has(c.action) || eukrasian) {
        if (gcd(c) && filler && !FOLLOW_UPS.has(filler.id))
          out.push({
            ...entry(c, filler, 'Damage'),
            attack: true,
            instead: action?.name ?? names.get(c.action),
            ...begun,
          });
        return;
      }
      out.push({ ...entry(c, action, 'Damage'), attack: true, ...begun });
    } else if (action?.gcd && action.effects.length) {
      // A GCD heal of theirs the plan has no use for: damage there instead.
      if (c.at <= openerEnd || slotTaken(c.at) || !filler) return;
      out.push({ ...entry(c, filler, 'Damage'), attack: true, instead: action.name });
    } else if (c.action !== EUKRASIA && !action?.effects.length && keptBuff(plan, mine, playerId, c)) {
      out.push(entry(c, action, whatItDoes(c.action, action)));
    }
  });
  const job = timeline.players.find((p) => p.id === playerId)?.job ?? '';
  if (!replanned) return out;
  const paid = withGaugePaid(job, out, mine, casts, catalog, filler);
  const shown = job === 'SGE' ? withStingsPaid(timeline, playerId, paid, mine, casts, catalog, filler) : paid;
  const withheld = (plan.withheld ?? []).filter((w) => w.player === playerId);
  const kept = withheld.length ? withoutWithheld(shown, withheld, byId, filler) : shown;
  return withCombosKept(kept, mine, casts, byId, filler);
}

// What the plan withholds (`withLegalCasts`): their usual attack in a GCD's slot, an oGCD gone.
function withoutWithheld(
  out: PlanUseEntry[],
  withheld: { action: number; at: number }[],
  byId: Map<number, CatalogAction>,
  filler: CatalogAction | undefined,
): PlanUseEntry[] {
  const gone = (e: PlanUseEntry) => withheld.some((w) => w.at === e.at && byId.get(w.action)?.name === e.action);
  return out.flatMap((e) => {
    if (!gone(e)) return [e];
    if (!e.gcd || !filler) return [];
    const instead = e.instead ?? e.action;
    const icon = filler.icon ?? null;
    return [
      {
        ...e,
        action: filler.name,
        icon,
        description: filler.description ?? null,
        kept: 'Damage',
        attack: true,
        instead,
      },
    ];
  });
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

// The damage GCD they cast most that costs nothing (no gauge, Cartridge or Addersting: a warrior's is Heavy Swing, not
// Fell Cleave): what they'd cast in a slot the plan frees.
export function usualAttack(casts: { action: number }[], byId: Map<number, CatalogAction>) {
  const counts = new Map<number, number>();
  for (const c of casts) {
    const action = byId.get(c.action);
    const free = !/cost:/i.test(action?.description ?? '');
    if (action?.gcd && free && onlyDamage(c.action, action)) counts.set(c.action, (counts.get(c.action) ?? 0) + 1);
  }
  const best = [...counts].sort((a, b) => b[1] - a[1])[0];
  return best ? byId.get(best[0]) : undefined;
}
