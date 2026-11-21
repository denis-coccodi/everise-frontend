import { ActionCatalog, PullTimeline, TimelinePlayer } from '@everise/core/api-types';
import { AFFLATUS_MISERY, ENERGY_DRAIN, OPENERS } from './opener-presets';
import { WEAVE_MS } from './weaving';
import { astrologianDraws, openerUses, scholarTimes, withStacksLeft } from './openers';
import type { OpenerId, Opening } from './openers.model';
import type { PlannedUse, ToolPool } from './plan.model';

// The cards each draw gives that the plan counts: Astral Draw's the Arrow
// and the Spire, Umbral Draw's the Bole, the Ewer and Lady of Crowns.
const ASTRAL_CARDS = ['the Arrow', 'the Spire'];
const UMBRAL_CARDS = ['the Bole', 'the Ewer', 'Lady of Crowns'];

export function openingOf(
  timeline: PullTimeline,
  catalog: ActionCatalog,
  players: TimelinePlayer[],
  chosen: Record<number, OpenerId> = {},
): Opening {
  const opening: Opening = { refills: new Map(), dissipations: new Map(), draws: new Map(), uses: [] };
  for (const p of players) {
    const job = p.job ?? '';
    if (!OPENERS[job]) continue;
    const uses = openerUses(timeline, catalog, p.id, job, chosen[p.id] ?? 'standard');
    opening.uses.push(...uses);
    if (job === 'SCH') {
      // Without an opener, Aetherflow from the first GCD (the standard one's).
      const firstGcd = openerUses(timeline, catalog, p.id, job, 'standard')[0]?.at ?? 0;
      const { aetherflow, dissipation } = scholarTimes(timeline, p.id, uses, firstGcd);
      // The plan's Aetherflows after the opener's, and the Dissipations it
      // keeps as played, show with it.
      const shown = (action: number, name: string, times: number[]) =>
        times
          .filter((at) => !uses.some((u) => u.action === action && u.at === at))
          .map((at): PlannedUse => ({ player: p.id, action, name, at, target: null, covers: [] }));
      opening.uses.push(...shown(166, 'Aetherflow', aetherflow), ...shown(3587, 'Dissipation', dissipation));
      opening.refills.set(
        p.id,
        [...aetherflow, ...dissipation].sort((a, b) => a - b),
      );
      opening.dissipations.set(p.id, dissipation);
    }
    if (job === 'AST') opening.draws.set(p.id, astrologianDraws(uses, timeline.durationMs));
  }
  return opening;
}

// The tools with each astrologian's cards as their draws bring them, and take them away.
export function withDraws<T extends { player: number; pool: ToolPool | null }>(tools: T[], opening: Opening): T[] {
  return tools.map((t) => {
    const draws = opening.draws.get(t.player);
    const name = t.pool?.name ?? '';
    const [refills, empties] = ASTRAL_CARDS.includes(name)
      ? [draws?.astral, draws?.umbral]
      : UMBRAL_CARDS.includes(name)
        ? [draws?.umbral, draws?.astral]
        : [];
    // Drawn at their draw, lost at the other one, which swaps them for its own.
    return refills && t.pool ? { ...t, pool: { ...t.pool, refills, empties } } : t;
  });
}

// The openers' steps the plan counts as it plans: their heals and
// mitigations (Assize, the Raptures, Pneuma, an Earthly Star or The Blackest
// Night in the countdown) and Afflatus Misery.
export function placedSteps(opening: Opening, isTool: (use: PlannedUse) => boolean): PlannedUse[] {
  return opening.uses.filter((u) => isTool(u) || u.action === AFFLATUS_MISERY);
}

// The openers' other steps, for the plan to show: a scholar's Energy
// Drains only where their heals left the stacks (`stackUses`).
export function shownSteps(
  opening: Opening,
  placed: PlannedUse[],
  stackUses: (player: number) => number[],
): PlannedUse[] {
  const shown = opening.uses.filter((u) => !placed.includes(u));
  const players = [...new Set(shown.map((u) => u.player))];
  return players.flatMap((player) => {
    const mine = shown.filter((u) => u.player === player);
    const refills = opening.refills.get(player);
    return refills ? withStacksLeft(mine, refills, stackUses(player)) : mine;
  });
}

// The openers' steps the plan shows with its own uses (`uses`, final): Seraph casts her Veils herself, no use to list;
// a scholar's Energy Drains only where the stacks its heals (`stackUse`) spend leave them, and the slot is free.
export function openerShown(
  opening: Opening,
  placed: PlannedUse[],
  uses: PlannedUse[],
  stackUse: (use: PlannedUse) => boolean,
): PlannedUse[] {
  const shown = shownSteps(opening, placed, (player) =>
    uses.filter((u) => u.player === player && stackUse(u)).map((u) => u.at),
  );
  const taken = (u: PlannedUse) => uses.some((b) => b.player === u.player && Math.abs(b.at - u.at) < WEAVE_MS);
  return shown.filter((u) => u.action !== ENERGY_DRAIN || !taken(u));
}
