import type { ActionCatalog, CatalogAction, PullTimeline } from '@everise/core/api-types';
import { fitsRecast, poolLevel } from './coverage';
import type { EditChoice, EditSlot, PlanEdit, PlanEdits } from './edits.model';
import type { InvulnerabilityChoice } from './invulnerabilities.model';
import type { Mechanic, Plan, PlannedUse } from './plan.model';
import { GRANTED, POOLS, playerActions } from './tools';
import { catalogAtLevel, pullLevel } from './trait-levels';

// A removed skill isn't planned this close to where it was again.
const REMOVED_MS = 1_500;
// An oGCD needs this much room from the player's other actions.
const WEAVE_MS = 600;
// A GCD added within this of one of theirs takes its place.
const SAME_GCD_MS = 600;
// How far the picker looks for when a skill fits again.
const LOOK_AHEAD_MS = 180_000;
const STEP_MS = 500;
// How far before a moment the picker offers slots.
const SLOTS_MS = 10_000;
// What an added heal (no lasting effect) is for: the hits this soon after.
const HEAL_COVERS_MS = 10_000;
// How long after its use an invulnerability saves its user, at most.
const SAVES_MS = 15_000;

const sameUse = (a: { player: number; action: number; at: number }, b: PlanEdit) =>
  a.player === b.player && a.action === b.action && Math.abs(a.at - b.at) < REMOVED_MS;

// The tools with the removed skills kept out of where they were, for the
// planner to put them anywhere else they're needed. A removed
// invulnerability is also kept off the mechanic it was saving (`notFor`),
// and only that one: it may still save one just before or after.
export function withBans<T extends { player: number; action: number; away?: { from: number; to: number }[] }>(
  tools: T[],
  edits: PlanEdits | undefined,
  mechanics: Mechanic[] = [],
): T[] {
  if (!edits?.removed.length) return tools;
  return tools.map((t) => {
    const banned = edits.removed.filter((r) => r.player === t.player && r.action === t.action);
    if (!banned.length) return t;
    const away = [...(t.away ?? []), ...banned.map((r) => ({ from: r.at - REMOVED_MS, to: r.at + REMOVED_MS }))];
    const effects = (t as { effects?: { invulnerable?: boolean }[] }).effects ?? [];
    if (!effects.some((e) => e.invulnerable)) return { ...t, away };
    const notFor = banned.map((r) => savedBy(r, mechanics)).filter((id): id is number => id !== null);
    return { ...t, away, notFor };
  });
}

// The mechanic an invulnerability used at `r` was saving its user from: the
// first that hits them in the seconds after.
function savedBy(r: PlanEdit, mechanics: Mechanic[]) {
  const hit = mechanics
    .filter((m) => m.at >= r.at && m.at - r.at <= SAVES_MS && m.hits.some((h) => h.player === r.player))
    .sort((a, b) => a.at - b.at)[0];
  return hit?.id ?? null;
}

// The tanks' invulnerabilities as the pull had them, but those the user
// removed: one taken out for its mechanic is no longer forced there (the
// plan may still use it where nothing else saves a hit).
export function keptInvulnerabilities(
  choices: InvulnerabilityChoice[],
  mechanics: Mechanic[],
  edits: PlanEdits | undefined,
): InvulnerabilityChoice[] {
  if (!edits?.removed.length) return choices;
  return choices.filter(
    (c) =>
      !edits.removed.some(
        (r) => r.player === c.player && r.action === c.action && savedBy(r, mechanics) === c.mechanic,
      ),
  );
}

// Whether a use the plan would keep fixed (an opener's step) was removed.
export const notRemoved = (edits: PlanEdits | undefined) => (u: PlannedUse) =>
  !edits?.removed.some((r) => sameUse(u, r));

// The edits of the players being replanned: a player planned as they
// played keeps their log, so their edits wait until they're replanned again.
export function ownEdits(edits: PlanEdits | undefined, replanned: (e: PlanEdit) => boolean): PlanEdits | undefined {
  return edits && { added: edits.added.filter(replanned), removed: edits.removed.filter(replanned) };
}

// The user's added skills, as uses the plan keeps where they are.
export function addedUses(edits: PlanEdits | undefined, catalog: ActionCatalog): PlannedUse[] {
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  return (edits?.added ?? []).map((e) => ({
    player: e.player,
    action: e.action,
    name: byId.get(e.action)?.name ?? 'Unknown',
    at: e.at,
    target: e.target ?? null,
    covers: [],
    edited: true,
  }));
}

// What the user's added skills cover, as the planner's say: the mechanics in
// their effects' time (the next few seconds for a heal) that hit whoever they
// protect: their target, their user, or anyone for a party-wide one.
export function withAddedCovers(uses: PlannedUse[], mechanics: Mechanic[], catalog: ActionCatalog): PlannedUse[] {
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  return uses.map((u) => {
    const action = byId.get(u.action);
    if (!u.edited || u.covers.length || !action) return u;
    const lasts = Math.max(HEAL_COVERS_MS, ...action.effects.map((e) => e.durationMs ?? 0));
    const anyone = action.effects.some((e) => e.target === 'party' || e.target === 'enemies');
    const who = action.effects.some((e) => e.target === 'target') ? (u.target ?? u.player) : u.player;
    const covers = mechanics
      .filter((m) => m.at >= u.at && m.at - u.at <= lasts && (anyone || m.hits.some((h) => h.player === who)))
      .map((m) => m.id);
    return { ...u, covers };
  });
}

// What the user could add for `player` at `at`, in the plan as it stands:
// each of their skills that heals, mitigates or grants one that does, and
// whether its recast, its gauge, its MP, what it needs used first and the
// room to use it allow it then; the ones that fit first.
export function editChoices(plan: Plan, timeline: PullTimeline, full: ActionCatalog, player: number, at: number) {
  const who = timeline.players.find((p) => p.id === player);
  if (!who) return [];
  const catalog = catalogAtLevel(full, pullLevel(timeline));
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const scheduled = new Set(plan.scheduled ?? []);
  // Their uses that stay put: the user's own, their opener's and burst, and
  // theirs as played of what the plan doesn't plan. The planner's other
  // choices give way: the plan is made again around what the user adds.
  const own = plan.uses.filter((u) => u.player === player && (u.edited || u.opener || u.burst || u.refill));
  const used = [
    ...own,
    ...timeline.playerCasts
      .filter((c) => c.source === player && !scheduled.has(`${player}:${c.action}`))
      .map((c) => ({ action: c.action, at: c.at })),
  ];
  const timesOf = (test: (a: CatalogAction) => boolean) =>
    used
      .filter((u) => {
        const a = byId.get(u.action);
        return !!a && test(a);
      })
      .map((u) => u.at);
  const gcds = timeline.playerCasts.filter((c) => c.source === player && byId.get(c.action)?.gcd);
  // The latest moment in `withinMs` before `at` that an enabler fits: in
  // place of one of their GCDs for a GCD, in the weave slot after one for
  // an oGCD (with room there, and its recast).
  const enablerAt = (enabler: CatalogAction, withinMs: number) => {
    const group = timesOf((a) => a.cooldownGroup === enabler.cooldownGroup && !a.gcd);
    const fits = (t: number) =>
      enabler.gcd ||
      (at - t >= WEAVE_MS &&
        !used.some((u) => Math.abs(u.at - t) < WEAVE_MS) &&
        fitsRecast(group, t, enabler.recastMs, enabler.charges));
    const times = gcds
      .filter((g) => g.at < at && at - g.at <= withinMs)
      .map((g) => (enabler.gcd ? g.at : g.at + Math.max(g.castMs ?? 0, WEAVE_MS)))
      .filter((t) => t < at && fits(t));
    return times.length ? Math.max(...times) : null;
  };
  const mpAt = (t: number) => {
    const points = plan.mp?.find((m) => m.player === player)?.points ?? [];
    return [...points].reverse().find((p) => p.at <= t)?.mp ?? null;
  };
  const choices: EditChoice[] = [];
  for (const action of playerActions(who, catalog)) {
    const helps = action.effects.some((e) => e.kind !== 'mp' && e.kind !== 'mpRegen') || action.id in GRANTED;
    if (!helps) continue;
    const reasons: string[] = [];
    // Recast and charges, shared with its cooldown group.
    const group = timesOf((a) => a.cooldownGroup === action.cooldownGroup && !a.gcd);
    if (!action.gcd && !fitsRecast(group, at, action.recastMs, action.charges)) {
      // One used later that its recast would clash with, or back after one before.
      const before = group.filter((t) => t <= at);
      const later = group.filter((t) => t > at && t - at < action.recastMs).sort((a, b) => a - b)[0];
      reasons.push(
        later !== undefined && fitsRecast(before, at, action.recastMs, action.charges)
          ? `Recast: also used at ${clock(later)}`
          : `Recast: back at ${clock(nextFit(at, (t) => fitsRecast(before, t, action.recastMs, action.charges)))}`,
      );
    }
    // A gauge (Oath, Aetherflow, Addersgall, lilies...).
    const pool = POOLS[action.id];
    if (pool) {
      const spent = timesOf((a) => POOLS[a.id]?.name === pool.name);
      if (poolLevel(spent, at, pool) < 1) {
        reasons.push(`No ${pool.name} until ${clock(nextFit(at, (t) => poolLevel(spent, t, pool) >= 1))}`);
      }
    }
    // What it needs used first (Divine Caress after Temperance...): added
    // with it where none is and it fits.
    const grant = GRANTED[action.id];
    let first: EditChoice['first'] = null;
    if (grant && !used.some((u) => u.action === grant.action && u.at <= at && at - u.at <= grant.withinMs)) {
      const enabler = byId.get(grant.action);
      const t = enabler ? enablerAt(enabler, grant.withinMs) : null;
      if (enabler && t !== null) first = { action: enabler.id, name: enabler.name, icon: enabler.icon, at: t };
      else reasons.push(`Needs ${enabler?.name ?? 'its enabler'} in the ${grant.withinMs / 1000}s before`);
    }
    // MP.
    const mp = mpAt(at);
    if (action.mpCost && mp !== null && mp < action.mpCost) {
      reasons.push(`Needs ${action.mpCost.toLocaleString('en')} MP (${Math.round(mp).toLocaleString('en')} then)`);
    }
    // Room: a weave slot for an oGCD, one of their GCDs for a GCD.
    const replaced = action.gcd ? gcds.find((g) => Math.abs(g.at - at) <= SAME_GCD_MS) : undefined;
    if (action.gcd && !replaced) reasons.push('No GCD of theirs here to replace');
    if (!action.gcd && used.some((u) => Math.abs(u.at - at) < WEAVE_MS)) reasons.push('No room to weave it here');
    choices.push({
      action: action.id,
      name: action.name,
      gcd: action.gcd,
      ok: !reasons.length,
      reason: reasons[0] ?? null,
      replaces: replaced ? (byId.get(replaced.action)?.name ?? null) : null,
      targeted: action.effects.some((e) => e.target === 'target'),
      icon: action.icon,
      description: action.description,
      replacesIcon: replaced ? (byId.get(replaced.action)?.icon ?? null) : null,
      first,
    });
  }
  return choices.sort((a, b) => Number(b.ok) - Number(a.ok) || a.name.localeCompare(b.name));
}

// Where the user can put a skill near a moment: in place of each of the
// player's GCDs as played in the seconds before it (for a GCD), or in the
// weave slot after each (for an oGCD), the latest first.
export function editSlots(timeline: PullTimeline, full: ActionCatalog, player: number, at: number): EditSlot[] {
  const byId = new Map(catalogAtLevel(full, pullLevel(timeline)).actions.map((a) => [a.id, a]));
  const gcds = timeline.playerCasts
    .filter((c) => c.source === player && byId.get(c.action)?.gcd && c.at <= at && at - c.at <= SLOTS_MS)
    .sort((a, b) => b.at - a.at);
  return gcds.flatMap((g) => {
    const name = byId.get(g.action)?.name ?? 'their GCD';
    return [
      { at: g.at + Math.max(g.castMs ?? 0, WEAVE_MS), label: `After ${name} at ${clock(g.at, true)}` },
      { at: g.at, label: `In place of ${name} at ${clock(g.at, true)}` },
    ];
  });
}

// The first moment from `at` a test passes, looking a few minutes ahead.
function nextFit(at: number, fits: (t: number) => boolean) {
  for (let t = at; t <= at + LOOK_AHEAD_MS; t += STEP_MS) if (fits(t)) return t;
  return at + LOOK_AHEAD_MS;
}

// m:ss (or m:ss.t), as the planner's times show.
function clock(ms: number, tenths = false) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const base = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return tenths ? `${base}.${Math.floor((Math.max(0, ms) % 1000) / 100)}` : base;
}
