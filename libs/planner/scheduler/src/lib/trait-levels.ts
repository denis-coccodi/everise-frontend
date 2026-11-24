import { ActionCatalog, CatalogAction, PullTimeline } from '@everise/core/api-types';

// The level a pull is played at: the party's, synced in the duty (100 when
// the log has no stats).
export function pullLevel(timeline: PullTimeline): number {
  return Math.min(100, ...timeline.players.flatMap((p) => (p.stats ? [p.stats.level] : [])));
}

// The catalog at a level: the actions learnt by then (no Scarlet Delirium at 90), each without the traits above it
// (Troubadour at 90: 10% where the level-100 tooltip says 15%; Essential Dignity at 90: 2 charges). Made once for each.
export function catalogAtLevel(catalog: ActionCatalog, level: number): ActionCatalog {
  const byLevel = LEVELED.get(catalog) ?? new Map<number, ActionCatalog>();
  LEVELED.set(catalog, byLevel);
  const known = byLevel.get(level);
  if (known) return known;
  const actions = catalog.actions.filter((a) => !a.level || a.level <= level).map((a) => actionAtLevel(a, level));
  const made = { ...catalog, actions };
  byLevel.set(level, made);
  return made;
}
const LEVELED = new WeakMap<ActionCatalog, Map<number, ActionCatalog>>();

function actionAtLevel(action: CatalogAction, level: number): CatalogAction {
  // Highest level first: the last one above the level is the earliest state.
  const below = (action.traits ?? []).filter((t) => t.level > level).at(-1);
  return below ? { ...action, recastMs: below.recastMs, charges: below.charges, effects: below.effects } : action;
}
