import { reaches } from './coverage';
import { deadIn } from './plan-score';
import type { Mechanic, MitigationTool, Plan, PlannedUse } from './plan.model';

// Whether a use an earlier plan placed is let go in a replan with `hard` mechanics first: one charge of its tool (of
// `tools`), and its recast still running at a hard mechanic it doesn't cover but could (the party's, or its user hit);
// placed again, the hard ones get it first if it's their best (Neutral Sect, Expedient, Shadowed Vigil kept for DM's
// Forsaken stretch, as the logs' healers keep them). Played, opener and edited uses stay.
export const freedForHard =
  (tools: MitigationTool[], mechanics: Mechanic[], hard: Set<number>) =>
  (use: PlannedUse): boolean => {
    const tool = tools.find((t) => t.player === use.player && t.action === use.action);
    if (!hard.size || !tool || use.played || use.opener || use.edited || tool.charges > 1) return false;
    const reachable = (m: Mechanic) =>
      tool.effects.some((e) => e.target !== 'self') || m.hits.some((h) => h.player === use.player);
    return mechanics.some(
      (m) =>
        hard.has(m.id) &&
        m.at > use.at &&
        m.at < use.at + tool.recastMs &&
        reachable(m) &&
        !m.hits.some((h) => reaches(tool, use, m, h).length),
    );
  };

// The uses kept, but those another granted (`grantedBy`) that lost it, freed (`freedForHard`): a Sun Sign stayed with
// its Neutral Sect placed again elsewhere, a Divine Caress without its Temperance, Accessions without Seraphism.
export function withTheirGrants(tools: MitigationTool[], kept: PlannedUse[]): PlannedUse[] {
  return kept.filter((u) => {
    const g = tools.find((t) => t.player === u.player && t.action === u.action)?.grantedBy;
    return (
      !g ||
      kept.some((o) => o.player === u.player && o.action === g.action && u.at >= o.at && u.at <= o.at + g.withinMs)
    );
  });
}

// How many times the heals are planned again with more mechanics first.
const TRIES = 2;

// The mechanics in the order their heals are planned: those `first`, then the rest, each in time order.
export function inPlanningOrder(mechanics: Mechanic[], first: Set<number>) {
  if (!first.size) return mechanics;
  return [...mechanics.filter((m) => first.has(m.id)), ...mechanics.filter((m) => !first.has(m.id))];
}

// The mechanics whose hits the plan leaves short.
function shortIn(plan: Plan) {
  return plan.hits.filter((h) => !h.safe && !h.avoidable).map((h) => h.mechanic);
}

// Heals planned in time order spend a cooldown on the first need they meet, even one a harder hit later needed.
// Where the plan leaves hits short, their mechanics' heals are planned first (`replan`), the rest's around them,
// with theirs in the recast, pool and MP checks; again with those it then leaves short too. Each kept if better
// (no more players dying, to any damage, and `better`), stopping at the first that isn't.
export function hardFirst<P extends Plan>(plan: P, replan: (first: Set<number>) => P, better: (a: P, b: P) => boolean) {
  let best = plan;
  let first = new Set<number>();
  for (let n = 0; n < TRIES; n++) {
    const next = new Set([...first, ...shortIn(best)]);
    if (next.size === first.size) break;
    const tried = replan(next);
    const [now, was] = [deadIn(tried), deadIn(best)];
    if (now > was || (now === was && !better(tried, best))) break;
    best = tried;
    first = next;
  }
  return { plan: best, first };
}
