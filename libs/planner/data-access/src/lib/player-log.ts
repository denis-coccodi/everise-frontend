import { ActionCatalog, CatalogAction, PullTimeline, TimelineAura } from '@everise/core/api-types';
import { attackSeverity, catalogAtLevel, pullLevel } from '@everise/planner/scheduler';
import { onlyDamage, whatItDoes } from './action-kinds';
import { effectsText } from './effect-text';
import { countdownStart } from './pull-time';
import type { HitEntry, UseEntry, DeathEntry, LogEntry } from './player-log.model';

// One player's pull, in time order: the hits they took (not damage over
// time ticks), everything they used (heals, mitigations, what made them
// possible, buffs, attacks), and their deaths.
export function playerLog(timeline: PullTimeline, full: ActionCatalog, playerId: number): LogEntry[] {
  // The actions as the pull's level has them, for what they did.
  const catalog = catalogAtLevel(full, pullLevel(timeline));
  const actionName = names(timeline.actions);
  const statusName = names(timeline.statuses);
  const enemyName = names(timeline.enemies);
  const playerName = new Map(timeline.players.map((player) => [player.id, player.name]));
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

  const severity = attackSeverity(timeline);
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
      severity: severity(hit.action, hit.at),
    }));

  // Everything they used, attacks too, so the tab shows their whole
  // rotation, as the plan's column does.
  const uses: UseEntry[] = timeline.playerCasts
    .filter((cast) => cast.source === playerId)
    .map((cast): UseEntry => {
      const action = actions.get(cast.action);
      const attack = onlyDamage(cast.action, action) ? { attack: true } : {};
      // One the catalog doesn't have (Umbral Draw, a combo step, a potion): the log's name.
      if (!action) {
        return {
          kind: 'use',
          at: cast.at,
          action: actionName(cast.action),
          target: null,
          effects: 'attack' in attack ? 'Damage' : whatItDoes(cast.action, action),
          ...attack,
        };
      }
      const castAt = countdownStart(cast.at, cast.castMs, action.castMs);
      // Who a single-target heal, shield or mitigation went on.
      const targeted = action.effects.some((effect) => effect.target === 'target');
      const target = targeted && cast.target !== null ? (playerName.get(cast.target) ?? null) : null;
      return {
        kind: 'use',
        at: cast.at,
        action: action.name,
        icon: action.icon,
        description: action.description ?? null,
        target,
        effects: action.effects.length
          ? effectsText(action.effects)
          : 'attack' in attack
            ? castAt === null
              ? 'Damage'
              : 'Damage, begun in the countdown'
            : whatItDoes(action.id, action),
        castAt,
        ...attack,
      };
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
