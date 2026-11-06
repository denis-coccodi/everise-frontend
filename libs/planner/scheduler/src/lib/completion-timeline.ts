import type { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import { mpPastWipePoint } from './completion-mp';
import { standIns } from './completion-players';
import type { Alignment } from './completion.model';
import type { ReferencedTimeline } from './reference-damage.model';
import { wipePoint } from './wipe-point';

// A kill's enemies that the wipe has none of by name get ids past any
// report's own.
const ADDED_ENEMY = 1_000_000;

// The wipe (`wipe`) with the part of the fight it never reached taken
// from another group's kill (`clear`, lined up by `aligned`): up to the
// wipe point everything is as played; after it, the kill's boss casts,
// hits and the statuses its enemies put up, shifted to continue the wipe
// and retargeted to the players standing in. Nothing the kill's players
// did comes with them: every player is planned from the wipe point on
// (`lateStarts`). The wipe point (`wipePoint`) is just before the
// mechanic that started the final deaths. Null when the kill ends before
// it: nothing is left to add.
export function completedTimeline(
  wipe: ReferencedTimeline,
  clear: PullTimeline,
  aligned: Alignment,
  catalog: ActionCatalog,
): ReferencedTimeline | null {
  const from = wipePoint(wipe);
  if (aligned.endsAt <= from) return null;
  const stand = standIns(wipe, clear);
  const enemies = enemyIds(wipe, clear);
  const player = (id: number | null) => (id === null ? undefined : stand[id]?.player);
  // A player's or an enemy's id, as the wipe knows them.
  const actor = (id: number | null) => player(id) ?? (id === null ? undefined : enemies.ids.get(id));
  const shift = (at: number) => at + aligned.offset;
  const after = <T extends { at: number }>(list: T[]) =>
    list.filter((e) => shift(e.at) > from && e.at <= clear.durationMs).map((e) => ({ ...e, at: shift(e.at) }));
  const before = <T extends { at: number }>(list: T[]) => list.filter((e) => e.at <= from);
  const mapped = <T>(list: T[], map: (e: T) => T | undefined) => list.flatMap((e) => map(e) ?? []);

  const damage = mapped(after(clear.damage), (h) => {
    const [target, source] = [player(h.target), actor(h.source)];
    return target === undefined || source === undefined ? undefined : { ...h, target, source, hp: null };
  });
  const enemyCasts = mapped(after(clear.enemyCasts), (c) => {
    const source = enemies.ids.get(c.source);
    return source === undefined ? undefined : { ...c, source, target: actor(c.target) ?? null };
  });
  // Statuses the kill's enemies put on anyone there.
  const auras = mapped(
    clear.auras.filter((a) => shift(a.from) > from && a.from <= clear.durationMs),
    (a) => {
      const target = actor(a.target);
      if (target === undefined || a.source === null || !enemies.ids.has(a.source)) return undefined;
      return { ...a, source: actor(a.source) ?? null, target, from: shift(a.from), to: shift(a.to) };
    },
  );
  // Each player's own MP from the wipe point on, and their MP spenders as
  // played past it (Edge of Shadow).
  const spenders: PullTimeline['playerCasts'] = [];
  const players = wipe.players.map((p) => {
    const own = mpPastWipePoint(wipe, p, from, aligned.endsAt, catalog);
    spenders.push(...own.casts);
    return { ...p, mp: [...before(p.mp), ...own.mp] };
  });
  return {
    ...wipe,
    durationMs: aligned.endsAt,
    players,
    enemies: [...wipe.enemies, ...enemies.added],
    actions: union(wipe.actions, clear.actions),
    statuses: union(wipe.statuses, clear.statuses),
    damage: [...before(wipe.damage), ...damage],
    heals: before(wipe.heals),
    absorbs: before(wipe.absorbs),
    playerCasts: [...before(wipe.playerCasts), ...spenders].sort((a, b) => a.at - b.at),
    enemyCasts: [...before(wipe.enemyCasts), ...enemyCasts],
    auras: [...wipe.auras.filter((a) => a.from <= from), ...auras],
    deaths: before(wipe.deaths),
    // An Ultimate's phases: the wipe's, then the kill's it never reached.
    phases: [...before(wipe.phases), ...after(clear.phases)],
    // When nothing could be targeted: the wipe's, then the kill's after it.
    downtime: [
      ...wipe.downtime.filter((d) => d.from <= from).map((d) => ({ ...d, to: Math.min(d.to, from) })),
      ...clear.downtime
        .map((d) => ({ from: shift(d.from), to: shift(d.to) }))
        .filter((d) => d.to > from)
        .map((d) => ({ ...d, from: Math.max(d.from, from) })),
    ],
    // The gauge: the wipe's, then the kill's after it.
    limitBreakGauge: [...before(wipe.limitBreakGauge ?? []), ...after(clear.limitBreakGauge ?? [])],
    completion: { from, clear: { code: clear.code, pullId: clear.pullId } },
  };
}

// The kill's enemies by the wipe's ids: by name, in order (a boss's copies
// to the wipe's copies), and new ones for those the wipe has none of.
function enemyIds(wipe: PullTimeline, clear: PullTimeline) {
  const ids = new Map<number, number>();
  const added: PullTimeline['enemies'] = [];
  const used = new Set<number>();
  for (const enemy of clear.enemies) {
    const ours = wipe.enemies.find((e) => e.name === enemy.name && !used.has(e.id));
    if (ours) {
      used.add(ours.id);
      ids.set(enemy.id, ours.id);
    } else {
      ids.set(enemy.id, ADDED_ENEMY + enemy.id);
      added.push({ ...enemy, id: ADDED_ENEMY + enemy.id });
    }
  }
  return { ids, added };
}

function union<T extends { id: number }>(ours: T[], theirs: T[]) {
  const known = new Set(ours.map((x) => x.id));
  return [...ours, ...theirs.filter((x) => !known.has(x.id))];
}
