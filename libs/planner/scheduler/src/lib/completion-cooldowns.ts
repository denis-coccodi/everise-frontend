import type { ActionCatalog, PullTimeline } from '@everise/core/api-types';

// A cast's own heals land this soon after it; its statuses go up as soon.
const LANDS_MS = 1500;

// The completed timeline without the copied oGCDs (after `from`) of
// `players` that wouldn't be ready: their own uses before `from` still
// have them on cooldown (all charges spent). Each goes with what it did:
// its heals, and the statuses and shields it put up.
export function dropUnready<T extends PullTimeline>(
  timeline: T,
  from: number,
  players: number[],
  catalog: ActionCatalog,
): T {
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const dropped = new Set<PullTimeline['playerCasts'][number]>();
  for (const player of players) {
    const casts = timeline.playerCasts.filter((c) => c.source === player).sort((a, b) => a.at - b.at);
    for (const action of new Set(casts.filter((c) => c.at > from).map((c) => c.action))) {
      const known = byId.get(action);
      if (!known || known.gcd) continue;
      let charges = known.charges;
      let back = Infinity;
      for (const cast of casts.filter((c) => c.action === action)) {
        while (charges < known.charges && back <= cast.at) {
          charges++;
          back = charges < known.charges ? back + known.recastMs : Infinity;
        }
        if (!charges) {
          if (cast.at > from) dropped.add(cast);
          continue;
        }
        if (charges-- === known.charges) back = cast.at + known.recastMs;
      }
    }
  }
  if (!dropped.size) return timeline;
  const gone = [...dropped].map((cast) => {
    const effects = byId.get(cast.action)?.effects ?? [];
    const statuses = new Set(effects.flatMap((e) => (e.statusId === null ? [] : [e.statusId])));
    const lasts = Math.max(LANDS_MS, ...effects.map((e) => e.durationMs ?? 0));
    return { cast, statuses, lasts };
  });
  const by = (source: number | null, at: number, matches: (g: (typeof gone)[number]) => boolean, within: number) =>
    gone.some((g) => g.cast.source === source && at >= g.cast.at && at - g.cast.at <= within && matches(g));
  return {
    ...timeline,
    playerCasts: timeline.playerCasts.filter((c) => !dropped.has(c)),
    heals: timeline.heals.filter(
      (h) =>
        !by(h.source, h.at, (g) => h.action === g.cast.action, LANDS_MS) &&
        !gone.some((g) => h.status !== null && g.statuses.has(h.status) && by(h.source, h.at, (x) => x === g, g.lasts)),
    ),
    absorbs: timeline.absorbs.filter(
      (a) => !gone.some((g) => g.statuses.has(a.status) && by(a.source, a.at, (x) => x === g, g.lasts)),
    ),
    auras: timeline.auras.filter(
      (a) => !gone.some((g) => g.statuses.has(a.status) && by(a.source, a.from, (x) => x === g, LANDS_MS)),
    ),
  };
}
