import { CatalogAction } from '@everise/core/api-types';
import { comboOf, type PlannedUse } from '@everise/planner/scheduler';
import type { PlanUseEntry } from './plan-log.model';

// How long a combo waits for its next step.
const COMBO_MS = 30_000;

// Each stand-in of their usual attack (in place of a cast the plan dropped) the next step of its combo, from the last
// step of that combo in their column: in a slot the plan frees, a player goes on with their combo, as the gauge rules
// have it (`withGaugePaid`); their usual attack, its first step, broke a combo they'd started (Hard Slash after Syphon
// Strike), and the gauge its last step gives with it. Each step the one they cast most that costs nothing and needs no
// status; other combos (Delirium's) don't break it.
export function withCombosKept(
  entries: PlanUseEntry[],
  mine: PlannedUse[],
  casts: { action: number }[],
  byId: Map<number, CatalogAction>,
  filler: CatalogAction | undefined,
): PlanUseEntry[] {
  if (!filler) return entries;
  const own = [...byId.values()].filter((a) => a.gcd && a.jobs.some((j) => filler.jobs.includes(j)));
  const counts = new Map<number, number>();
  for (const c of casts) counts.set(c.action, (counts.get(c.action) ?? 0) + 1);
  const free = (a: CatalogAction) => !/cost:|can only be executed/i.test(a.description ?? '');
  const nextOf = new Map<string, CatalogAction>();
  for (const a of own.filter(free))
    for (const step of comboOf(a) ?? []) {
      const had = nextOf.get(step);
      if (!had || (counts.get(a.id) ?? 0) > (counts.get(had.id) ?? 0)) nextOf.set(step, a);
    }
  // Their usual attack's combo: it, and every step after it.
  const chain = new Set([filler.name]);
  for (let grew = true; grew;) {
    grew = false;
    for (const a of own)
      if (!chain.has(a.name) && (comboOf(a) ?? []).some((s) => chain.has(s))) {
        chain.add(a.name);
        grew = true;
      }
  }
  const planned = mine.flatMap((u) => {
    const a = byId.get(u.action);
    return a?.gcd ? [{ at: u.at, action: a.name }] : [];
  });
  const gcds = [...entries.filter((e) => e.gcd), ...planned].sort((a, b) => a.at - b.at);
  const changed = new Map<PlanUseEntry, CatalogAction>();
  let last: { name: string; at: number } | null = null;
  for (const g of gcds) {
    const standIn = 'instead' in g && !!g.instead && g.action === filler.name;
    const next: CatalogAction | undefined =
      standIn && last && g.at - last.at <= COMBO_MS ? nextOf.get(last.name) : undefined;
    if (next) changed.set(g as PlanUseEntry, next);
    const name: string = next?.name ?? g.action;
    if (chain.has(name)) last = { name, at: g.at };
  }
  return entries.map((e) => {
    const a = changed.get(e);
    return a ? { ...e, action: a.name, icon: a.icon ?? null, description: a.description ?? null } : e;
  });
}
