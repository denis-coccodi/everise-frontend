import { ActionCatalog, CatalogAction, PullTimeline, TimelineAura } from '@everise/core/api-types';
import { effectsText } from './effect-text';
import type { HitEntry, UseEntry, DeathEntry, LogEntry } from './player-log.model';

// One player's pull, in time order: the hits they took (not damage over
// time ticks), the heals and mitigations they used, and their deaths.
export function playerLog(timeline: PullTimeline, catalog: ActionCatalog, playerId: number): LogEntry[] {
  const actionName = names(timeline.actions);
  const statusName = names(timeline.statuses);
  const enemyName = names(timeline.enemies);
  const actions = new Map<number, CatalogAction>(catalog.actions.map((action) => [action.id, action]));
  // Which statuses mitigate or shield, and which are debuffs on enemies.
  const covering = new Set<number>();
  const onEnemies = new Set<number>();
  for (const action of catalog.actions) {
    for (const effect of action.effects) {
      if (effect.statusId === null || (effect.kind !== 'mitigation' && effect.kind !== 'shield')) continue;
      (effect.target === 'enemies' ? onEnemies : covering).add(effect.statusId);
    }
  }
  const maxHp = timeline.players.find((player) => player.id === playerId)?.maxHp ?? null;

  const hits: HitEntry[] = timeline.damage
    .filter((hit) => hit.target === playerId && !hit.tick)
    .map((hit) => ({
      kind: 'hit',
      at: hit.at,
      action: actionName(hit.action),
      source: enemyName(hit.source),
      amount: hit.amount,
      unmitigated: hit.unmitigated,
      mitigated: hit.unmitigated ? hit.mitigated / hit.unmitigated : null,
      absorbed: hit.absorbed,
      overkill: hit.overkill,
      hp: hit.hp,
      hpShare: hit.hp !== null && maxHp ? hit.hp / maxHp : null,
      covers: [
        ...hit.statuses.filter((id) => covering.has(id)).map(statusName),
        ...debuffsOn(timeline.auras, hit.source, hit.at, onEnemies).map(statusName),
      ],
    }));

  const uses: UseEntry[] = timeline.playerCasts
    .filter((cast) => cast.source === playerId && (actions.get(cast.action)?.effects.length ?? 0) > 0)
    .map((cast) => {
      const action = actions.get(cast.action) as CatalogAction;
      return { kind: 'use', at: cast.at, action: action.name, effects: effectsText(action.effects) };
    });

  const deaths: DeathEntry[] = timeline.deaths
    .filter((death) => death.player === playerId)
    .map((death) => ({ kind: 'death', at: death.at, action: death.action === null ? null : actionName(death.action) }));

  return [...hits, ...uses, ...deaths].sort((a, b) => a.at - b.at);
}

// The debuffs from `wanted` on an enemy at a moment.
function debuffsOn(auras: TimelineAura[], enemy: number, at: number, wanted: Set<number>) {
  return [
    ...new Set(
      auras
        .filter((aura) => aura.target === enemy && wanted.has(aura.status) && aura.from <= at && at <= aura.to)
        .map((aura) => aura.status),
    ),
  ];
}

function names(list: { id: number; name: string }[]) {
  const byId = new Map(list.map((item) => [item.id, item.name]));
  return (id: number) => byId.get(id) || 'Unknown';
}
