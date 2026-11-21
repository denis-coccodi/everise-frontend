import { ActionCatalog, CatalogAction, PullTimeline } from '@everise/core/api-types';
import {
  TOXIKONS,
  healPower,
  stingsAtPull,
  stingsFrom,
  unpaidToxikons,
  type PlannedUse,
} from '@everise/planner/scheduler';
import type { PlanUseEntry } from './plan-log.model';

// A replanned sage's Toxikons kept as played that their Addersting can't pay for: the plan's Eukrasian Diagnoses and
// Prognoses are theirs, and the stacks come from those whose barrier breaks (`stingsFrom`). Their usual attack
// instead. They start with what their log needed at the pull. On 19 sages' logs, 2 of 468 Toxikons as played had no
// stack by this count.
export function withStingsPaid(
  timeline: PullTimeline,
  sage: number,
  out: PlanUseEntry[],
  mine: PlannedUse[],
  played: { action: number; at: number; target: number | null }[],
  catalog: ActionCatalog,
  filler: CatalogAction | undefined,
): PlanUseEntry[] {
  const toxikonNames = new Set(catalog.actions.filter((a) => TOXIKONS.has(a.id)).map((a) => a.name));
  if (!filler || !out.some((e) => toxikonNames.has(e.action) && !e.instead)) return out;
  const power = healPower(timeline, catalog).get(sage) ?? 0;
  const own = (c: { action: number; at: number; target: number | null }, isOwn: boolean) => ({ ...c, own: isOwn });
  // What they had at the pull: what their Toxikons as played needed, with their barriers as played.
  const theirs = played.map((c) => own(c, false));
  const start = stingsAtPull(
    theirs.filter((c) => TOXIKONS.has(c.action)),
    stingsFrom(timeline, catalog, sage, power, theirs),
  );
  const stings = stingsFrom(
    timeline,
    catalog,
    sage,
    power,
    mine.map((u) => own({ action: u.action, at: u.at, target: u.target }, true)),
  );
  const toxikons = out
    .filter((e) => toxikonNames.has(e.action) && !e.instead)
    .map((entry) => ({
      action: TOXIKONS.values().next().value as number,
      at: entry.at,
      target: null,
      own: false,
      entry,
    }));
  const unpaid = unpaidToxikons(toxikons, stings, start);
  const gone = new Set(toxikons.filter((t) => unpaid.has(t)).map((t) => t.entry));
  return out.map((e) =>
    gone.has(e)
      ? {
          ...e,
          action: filler.name,
          icon: filler.icon ?? null,
          description: filler.description ?? null,
          kept: 'Damage',
          instead: e.action,
        }
      : e,
  );
}
