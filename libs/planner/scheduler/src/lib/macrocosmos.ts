import type { ActionCatalog, TimelinePlayer } from '@everise/core/api-types';
import type { Mechanic, PlannedUse } from './plan.model';
import { playerActions } from './tools';
import type { Weaving } from './weaving';

const MACROCOSMOS = 25874;
// Cast this long before the raidwide at least, so it's up for it.
const LEAD_MS = 500;
// As early as this before the raidwide, else the next one.
const WINDOW_MS = 8_000;
// Back from its recast, it waits for the heaviest raidwide this soon after.
const PICK_MS = 60_000;

// A replanned astrologian's Macrocosmos, as top ones cast it (about every
// three minutes, four or five times a fight): back from its recast, in their
// GCD slot just before the raidwide taking the party the most within
// `PICK_MS`, so it takes in that hit's damage and heals half of it back. A damage spell, it costs no damage. Its uses, their
// slots taken in `weaving`.
export function macrocosmosUses(
  players: TimelinePlayer[],
  catalog: ActionCatalog,
  mechanics: Mechanic[],
  weaving: Weaving,
): PlannedUse[] {
  const raidwides = mechanics.filter((m) => m.kind === 'raidwide' && !m.wipe && m.hits.some((h) => !h.avoidable));
  // What a raidwide takes of the party before mitigation.
  const heavy = (m: Mechanic) => m.hits.reduce((sum, h) => sum + (h.avoidable ? 0 : h.unmitigated), 0);
  const uses: PlannedUse[] = [];
  for (const p of players) {
    const action = playerActions(p, catalog).find((a) => a.id === MACROCOSMOS);
    if (!action) continue;
    const own: { at: number; gcd: boolean; castMs: number }[] = [];
    for (let due = 0; ;) {
      const ahead = raidwides.filter((r) => r.at - LEAD_MS >= due);
      if (!ahead.length) break;
      const window = ahead.filter((r) => r.at < ahead[0].at + PICK_MS);
      const m = window.reduce((a, b) => (heavy(b) > heavy(a) ? b : a));
      const latest = m.at - LEAD_MS - action.castMs;
      const at = weaving.gcdBefore(p.id, latest, Math.max(due, latest - WINDOW_MS), action.castMs, own);
      if (at === null) {
        due = m.at;
        continue;
      }
      uses.push({ player: p.id, action: MACROCOSMOS, name: action.name, at, target: null, covers: [m.id] });
      own.push({ at, gcd: true, castMs: action.castMs });
      due = at + action.recastMs;
    }
  }
  weaving.keep(uses.map((u) => ({ player: u.player, at: u.at, gcd: true, castMs: catalogCast(catalog, u.action) })));
  return uses;
}

const catalogCast = (catalog: ActionCatalog, id: number) => catalog.actions.find((a) => a.id === id)?.castMs ?? 0;
