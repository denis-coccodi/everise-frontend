import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import { PlannedUse } from './plan.model';
import type { BuffSpan, HealingBuff } from './healing-buffs.model';
import type { HpEvent } from './hp-track.model';

// The catalog's healing buffs, by action. Those that only sometimes apply
// (Zoe: the next healing spell) only with `conditional`.
export function healingBuffsOf(catalog: ActionCatalog, conditional = false): Map<number, HealingBuff[]> {
  const byAction = new Map<number, HealingBuff[]>();
  for (const action of catalog.actions) {
    const buffs: HealingBuff[] = [];
    for (const e of action.effects) {
      if (e.kind !== 'healingPotency' && e.kind !== 'healingReceived') continue;
      if (!e.percent || !e.durationMs || e.target === 'enemies' || (e.condition && !conditional)) continue;
      buffs.push({
        action: action.id,
        kind: e.kind === 'healingPotency' ? 'potency' : 'received',
        target: e.target,
        share: e.percent / 100,
        durationMs: e.durationMs,
        status: e.status ?? action.name,
        statusId: e.statusId,
      });
    }
    if (buffs.length) byAction.set(action.id, buffs);
  }
  return byAction;
}

// The healing buffs up over the pull: those of the actions the plan
// schedules (`planned`, "player:action") as it uses them, every other as it
// was played (Mantra, Nature's Minne, a Neutral Sect).
export class HealingBuffs {
  private readonly spans: BuffSpan[] = [];

  constructor(
    private readonly byAction: Map<number, HealingBuff[]>,
    private readonly party: number[],
    timeline: PullTimeline,
    planned: Set<string>,
  ) {
    const byStatus = new Map<number, HealingBuff>();
    for (const buffs of byAction.values()) for (const b of buffs) if (b.statusId) byStatus.set(b.statusId, b);
    for (const aura of timeline.auras) {
      const buff = byStatus.get(aura.status);
      if (!buff || (aura.source !== null && planned.has(`${aura.source}:${buff.action}`))) continue;
      this.spans.push({ player: aura.target, buff, from: aura.from, to: aura.to });
    }
  }

  // A planned use's buffs, on whoever they go on.
  add(use: PlannedUse) {
    for (const buff of this.byAction.get(use.action) ?? []) {
      const players =
        buff.target === 'party' ? this.party : buff.target === 'self' ? [use.player] : [use.target ?? use.player];
      for (const player of players) this.spans.push({ player, buff, from: use.at, to: use.at + buff.durationMs });
    }
  }

  // What a use's heals become: each times the caster's potency buffs when
  // it's used, if it's a spell, and the target's received ones when it
  // lands. Buffs of one status count once, their strongest; others
  // multiply.
  boost(events: HpEvent[], use: PlannedUse, spell: boolean): HpEvent[] {
    const potency = spell ? this.multiplier(use.player, use.at, 'potency') : 1;
    return events.map((e) => ({ ...e, amount: e.amount * potency * this.multiplier(e.player, e.at, 'received') }));
  }

  private multiplier(player: number, at: number, kind: HealingBuff['kind']) {
    const strongest = new Map<string, number>();
    for (const { buff, ...span } of this.spans) {
      if (span.player !== player || buff.kind !== kind || at < span.from || at > span.to) continue;
      strongest.set(buff.status, Math.max(strongest.get(buff.status) ?? 0, buff.share));
    }
    let multiplier = 1;
    for (const share of strongest.values()) multiplier *= 1 + share;
    return multiplier;
  }
}

// Whether any healing buff was up, as played, on the caster or the target
// of a heal at `at` (a potency one on the caster, a received one on the
// target): its HP says more than its potency.
export function buffedAsPlayed(
  byAction: Map<number, HealingBuff[]>,
  timeline: PullTimeline,
): (caster: number, target: number, at: number) => boolean {
  const kindOf = new Map<number, HealingBuff['kind']>();
  for (const buffs of byAction.values()) for (const b of buffs) if (b.statusId) kindOf.set(b.statusId, b.kind);
  const spans = timeline.auras.filter((a) => kindOf.has(a.status));
  return (caster, target, at) =>
    spans.some((a) => {
      const holder = kindOf.get(a.status) === 'potency' ? caster : target;
      return a.target === holder && at >= a.from && at <= a.to;
    });
}
