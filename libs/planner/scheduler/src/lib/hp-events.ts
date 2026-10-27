import { PullTimeline } from '@everise/core/api-types';
import { TICK_MS } from './heal-tools';
import { isMechanicHit } from './mechanics';
import { HealTool, Mechanic, PlannedHit, PlannedUse } from './plan.model';
import type { HpEvent } from './hp-track.model';

// The game's natural regeneration, which logs show as an action of its own:
// 1% of max HP every 3s, on each player's own tick, whenever they're missing
// HP.
const NATURAL_REGEN = 1302;
const NATURAL_SHARE = 0.01;

// What happens to the party's HP besides the plan's heals: the mechanics'
// hits as the plan leaves them, every other hit (auto-attacks, damage over
// time, the floor) as it was played, and the healing the plan doesn't
// schedule as it was played (a tank's own sustain, Kardia, the faerie's
// Embrace), all of it with its overheal, as the HP it lands on may differ.
// Natural regeneration isn't among them: the log has it only where the HP
// as played was missing some (`naturalRegen` recalculates it).
export function pullEvents(
  timeline: PullTimeline,
  mechanics: Mechanic[],
  hits: PlannedHit[],
  heals: HealTool[],
): HpEvent[] {
  const actionName = new Map(timeline.actions.map((a) => [a.id, a.name]));
  const statusName = new Map(timeline.statuses.map((s) => [s.id, s.name]));
  const at = new Map(mechanics.map((m) => [m.id, m.at]));
  // A hit under an invulnerability that lets it land (Holmgang) leaves 1 HP.
  const events: HpEvent[] = hits.map((hit) => ({
    at: at.get(hit.mechanic) ?? 0,
    player: hit.player,
    amount: -hit.planned,
    ...(hit.invulnerable ? { floor: 1 } : {}),
  }));
  for (const hit of timeline.damage) {
    if (!isMechanicHit(hit, actionName)) events.push({ at: hit.at, player: hit.target, amount: -hit.amount });
  }

  // The heals the plan counts itself: its heal tools' actions and the
  // statuses of their healing over time, by id or (for a pet's) by name.
  const own = new Set<string>();
  for (const t of heals) {
    own.add(`${t.player}:${t.action}`).add(`${t.player}:${t.name}`);
    if (t.delayed) own.add(`${t.player}:${t.delayed.loggedAs}`).add(`${t.player}:status ${t.delayed.loggedAs}`);
    for (const e of t.effects) {
      if (e.statusId) own.add(`${t.player}:status ${e.statusId}`);
      if (e.status) own.add(`${t.player}:status ${e.status}`);
    }
  }
  for (const heal of timeline.heals) {
    // No source: the Limit Break (a raise), or ticks no healer was credited.
    if (heal.source === null || heal.action === NATURAL_REGEN) continue;
    // A tick names its status (a merged one, "Combined HoTs", as well).
    const keys = [
      ...(heal.action !== null
        ? [`${heal.source}:${heal.action}`, `${heal.source}:${actionName.get(heal.action)}`]
        : []),
      ...(heal.status !== null
        ? [`${heal.source}:status ${heal.status}`, `${heal.source}:status ${statusName.get(heal.status)}`]
        : []),
    ];
    if (keys.some((k) => own.has(k))) continue;
    events.push({ at: heal.at, player: heal.target, amount: heal.amount + heal.overheal });
  }
  return events;
}

// Everyone's natural regeneration over the pull, as the plan has their HP:
// 1% of max HP every 3s on each player's tick, for those the log shows it
// on (anyone who lost HP), the HP track keeping it to what's missing.
export function naturalRegen(timeline: PullTimeline): HpEvent[] {
  const events: HpEvent[] = [];
  for (const player of timeline.players) {
    const first = timeline.heals.find((h) => h.action === NATURAL_REGEN && h.target === player.id)?.at;
    if (!player.maxHp || first === undefined) continue;
    const amount = Math.floor(player.maxHp * NATURAL_SHARE);
    for (let at = first % TICK_MS; at <= timeline.durationMs; at += TICK_MS) {
      events.push({ at, player: player.id, amount });
    }
  }
  return events;
}

// The HP a use of a heal tool restores, and when: a heal as it lands (after
// its cast, and `delayMs` more for a delayed heal), healing over time every
// 3 seconds from 3 seconds later.
export function healEvents(
  tool: HealTool,
  use: PlannedUse,
  party: number[],
  maxHp: Map<number, number>,
  delayMs = 0,
): HpEvent[] {
  const lands = use.at + tool.castMs + delayMs;
  const events: HpEvent[] = [];
  for (const effect of tool.effects) {
    const players =
      effect.target === 'party' ? party : effect.target === 'self' ? [use.player] : [use.target ?? use.player];
    for (const player of players) {
      const amount = 'hp' in effect.size ? effect.size.hp : effect.size.maxHpShare * (maxHp.get(player) ?? 0);
      if (!effect.status) events.push({ at: lands, player, amount });
      else for (let k = 1; k <= effect.ticks; k++) events.push({ at: lands + k * TICK_MS, player, amount });
    }
  }
  return events;
}
