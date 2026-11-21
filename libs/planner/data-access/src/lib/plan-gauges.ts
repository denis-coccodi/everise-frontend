import { ActionCatalog, CatalogAction } from '@everise/core/api-types';
import {
  SPENDER,
  allPaid,
  gaugeAtPull,
  hasTankGauge,
  unpaidSpends,
  type GaugeCast,
  type PlannedUse,
} from '@everise/planner/scheduler';
import type { PlanUseEntry } from './plan-log.model';

// How long what a spend enables lasts: a combo, a Ready to Rip.
const ENABLED_MS = 30_000;

// A replanned tank's casts kept as played whose gauge the plan column can't pay for (`unpaidSpends`: a Fell Cleave
// that was free in an Inner Release the plan moved, a Bloodspiller whose Souleater a follow-up took the place of):
// their usual attack that costs nothing there instead, or their spender where the gauge pays for it (`withSpends`).
// The plan's own spends (Inner Chaos) get the gauge first; they start with what their log needed at the pull. On 32
// kills, 504 spends of the plan column had no gauge (408 warriors' Fell Cleaves); now none.
export function withGaugePaid(
  job: string,
  out: PlanUseEntry[],
  mine: PlannedUse[],
  played: { action: number; at: number }[],
  catalog: ActionCatalog,
  // Their usual attack (`usualAttack`), which costs nothing.
  filler: CatalogAction | undefined,
): PlanUseEntry[] {
  if (!hasTankGauge(job)) return out;
  const byName = new Map(catalog.actions.filter((a) => a.jobs.includes(job)).map((a) => [a.name, a]));
  // A stand-in (their usual attack "in place of" one the plan dropped) is a GCD slot, not a cast: it breaks no combo,
  // as a player short of gauge presses their combo's next step and the combo goes on.
  const kept = out
    .filter((entry) => !entry.instead)
    .map((entry) => ({ entry, action: byName.get(entry.action)?.id }))
    .filter((k): k is { entry: PlanUseEntry; action: number } => k.action !== undefined);
  const casts: (GaugeCast & { entry?: PlanUseEntry })[] = [
    ...mine.map((u) => ({ action: u.action, at: u.at, own: true })),
    ...kept.map((k) => ({ action: k.action, at: k.entry.at, own: false, entry: k.entry })),
  ].sort((a, b) => a.at - b.at);
  const start = gaugeAtPull(
    job,
    played.map((c) => ({ ...c, own: false })),
    catalog,
  );
  const unpaid = unpaidSpends(job, casts, catalog, start);
  const gone = withWhatTheyEnabled(
    out,
    new Set(casts.filter((c) => unpaid.has(c) && c.entry).map((c) => c.entry as PlanUseEntry)),
    byName,
  );
  const standIn = (e: PlanUseEntry, a: CatalogAction): PlanUseEntry => ({
    ...e,
    action: a.name,
    icon: a.icon ?? null,
    description: a.description ?? null,
    kept: 'Damage',
    instead: e.instead ?? e.action,
  });
  const result = out.filter((e) => !gone.has(e) || e.gcd).map((e) => (gone.has(e) && filler ? standIn(e, filler) : e));
  return withSpends(
    job,
    result,
    casts.filter((c) => !c.entry || !gone.has(c.entry)),
    catalog,
    start,
    standIn,
  );
}

// Each stand-in (their usual attack in place of one the plan dropped: a Scarlet Delirium its Delirium no longer
// covers) their spender where the gauge pays for it, everything kept still paid: there they'd have pressed their
// Bloodspiller, Fell Cleave or Burst Strike. Without, the gauge those slots freed went to waste (on 32 kills, 535
// Bloodspillers as played to 413).
function withSpends(
  job: string,
  entries: PlanUseEntry[],
  kept: GaugeCast[],
  catalog: ActionCatalog,
  start: number,
  standIn: (e: PlanUseEntry, a: CatalogAction) => PlanUseEntry,
): PlanUseEntry[] {
  const spender = catalog.actions.find((a) => a.id === SPENDER[job]);
  if (!spender) return entries;
  const casts = [...kept];
  const upgraded = new Set<PlanUseEntry>();
  for (const e of [...entries].filter((x) => x.instead && x.gcd).sort((a, b) => a.at - b.at)) {
    const withIt = [...casts, { action: spender.id, at: e.at, own: false }].sort((a, b) => a.at - b.at);
    if (!allPaid(job, withIt, catalog, start)) continue;
    casts.splice(0, casts.length, ...withIt);
    upgraded.add(e);
  }
  return entries.map((e) => (upgraded.has(e) ? standIn(e, spender) : e));
}

const text = (a: CatalogAction | undefined) => (a?.description ?? '').replace(/\n/g, ' | ');
const latest = <T>(list: T[]) => list[list.length - 1];
// What a spend gone took with it, in turn: the next step of its combo ("Combo Action: Gnashing Fang") and an oGCD
// needing what it granted ("Grants Ready to Rip", Jugular Rip "when Ready to Rip"), each within the 30s they last.
function withWhatTheyEnabled(out: PlanUseEntry[], gone: Set<PlanUseEntry>, byName: Map<string, CatalogAction>) {
  const sorted = [...out].sort((a, b) => a.at - b.at);
  sorted.forEach((e, i) => {
    if (gone.has(e)) return;
    const a = byName.get(e.action);
    const before = sorted.slice(0, i).filter((o) => e.at - o.at <= ENABLED_MS);
    const combo = /combo action: ([^|]+?)\s*(?:\||$)/i.exec(text(a))?.[1].split(' or ');
    const needs = /can only be executed (?:when|while) (?:under the effect of )?([^.|]+)/i.exec(text(a))?.[1].trim();
    const from = combo
      ? latest(before.filter((o) => combo.includes(o.action)))
      : needs
        ? latest(before.filter((o) => new RegExp('grants ' + needs, 'i').test(text(byName.get(o.action)))))
        : undefined;
    if (from && gone.has(from)) gone.add(e);
  });
  return gone;
}
