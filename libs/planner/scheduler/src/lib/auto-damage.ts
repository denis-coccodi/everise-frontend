import type { PullTimeline, TimelineHit } from '@everise/core/api-types';
import { landsAt, reaches, shareAgainst } from './coverage';
import type { PullFacts } from './coverage.model';
import type { HpEvent } from './hp-track.model';
import type { Mechanic, MitigationEffect, MitigationTool, PlannedUse } from './plan.model';

// What the boss's auto-attacks take with the plan's mitigations and shields,
// not with those up as played: as dealt, they'd count a tank's cooldowns as
// played (The Blackest Night, Holy Sheltron...) on top of the plan's uses of
// them, and a tank who skipped theirs would weigh on the plan. Each counts
// its damage before mitigation, less the plan's mitigations (each status
// once, its strongest), then less its shields, each as big as it is and used
// up by the autos in turn. A shield the plan has a mechanic break (the
// projection's rule) takes no autos after it. An auto the log has no damage
// before mitigation for stays as dealt, as does damage over time.
export class AutoDamage {
  private readonly autos = new Map<number, Auto[]>();
  private readonly uses: PlannedUse[];

  constructor(
    timeline: PullTimeline,
    uses: PlannedUse[],
    private readonly toolOf: (use: PlannedUse) => MitigationTool | undefined,
    private readonly facts: PullFacts,
  ) {
    this.uses = uses.filter((u) => toolOf(u));
    const named = new Map(timeline.actions.map((a) => [a.id, a.name]));
    for (const hit of timeline.damage) {
      if (hit.tick || !hit.unmitigated || named.get(hit.action)?.toLowerCase() !== 'attack') continue;
      const probe: Mechanic = {
        id: 0,
        at: hit.at,
        action: hit.action,
        name: 'Attack',
        kind: 'targeted',
        damageType: hit.damageType,
        hits: [{ player: hit.target, unmitigated: hit.unmitigated, asPlayed: hit.amount, avoidable: false }],
      };
      const list = this.autos.get(hit.target) ?? [];
      list.push({ hit, probe, amount: hit.amount });
      this.autos.set(hit.target, list);
    }
    for (const [player, list] of this.autos) {
      list.sort((a, b) => a.hit.at - b.hit.at);
      this.project(player);
    }
  }

  // What the hit takes with the plan.
  readonly amountOf = (hit: TimelineHit): number =>
    this.autos.get(hit.target)?.find((a) => a.hit === hit)?.amount ?? hit.amount;

  // One more use up (a heal that also mitigates: Kerachole...): what the
  // autos it reaches take less, as HP given back.
  add(use: PlannedUse): HpEvent[] {
    const tool = this.toolOf(use);
    if (!tool) return [];
    this.uses.push(use);
    const players = tool.effects.some((e) => e.target === 'party' || e.target === 'enemies')
      ? [...this.autos.keys()]
      : [...new Set(tool.effects.map((e) => (e.target === 'self' ? use.player : (use.target ?? use.player))))];
    return players.flatMap((player) => {
      const before = (this.autos.get(player) ?? []).map((a) => a.amount);
      this.project(player);
      return (this.autos.get(player) ?? [])
        .map((a, i) => ({ at: a.hit.at, player, amount: before[i] - a.amount }))
        .filter((e) => e.amount !== 0);
    });
  }

  private project(player: number) {
    // What's left of each shield (by use and status); a status renewed
    // replaces the one before.
    const left = new Map<string, number>();
    for (const auto of this.autos.get(player) ?? []) {
      const [hit] = auto.probe.hits;
      const strongest = new Map<string, number>();
      const shields = new Map<string, { key: string; from: number }>();
      for (const use of this.uses) {
        const tool = this.toolOf(use) as MitigationTool;
        for (const effect of reaches(tool, use, auto.probe, hit)) {
          if (effect.invulnerable) continue;
          if (!effect.shield) {
            const share = shareAgainst(effect, auto.probe.damageType);
            if (share > (strongest.get(effect.stack) ?? 0)) strongest.set(effect.stack, share);
            continue;
          }
          const from = landsAt(tool, use);
          if (this.facts.hitsBetween(player, from, auto.hit.at) >= effect.hits) continue;
          const key = `${use.player}:${use.action}:${use.at}:${effect.status}`;
          if (!left.has(key)) left.set(key, this.size(effect, use, tool, player));
          if (from >= (shields.get(effect.stack)?.from ?? -Infinity)) shields.set(effect.stack, { key, from });
        }
      }
      let damage = hit.unmitigated;
      for (const share of strongest.values()) damage *= 1 - share;
      for (const { key } of shields.values()) {
        const taken = Math.min(damage, left.get(key) ?? 0);
        left.set(key, (left.get(key) ?? 0) - taken);
        damage -= taken;
      }
      auto.amount = Math.round(damage);
    }
  }

  // A shield's size on the player it's on.
  private size(effect: MitigationEffect, use: PlannedUse, tool: MitigationTool, player: number) {
    const size = effect.shield;
    if (!size) return 0;
    const hp = 'hp' in size ? size.hp : size.maxHpShare * (this.facts.maxHp.get(player) ?? 0);
    return hp * (tool.gcd ? this.facts.shieldTimes(use, this.uses) : 1);
  }
}

interface Auto {
  hit: TimelineHit;
  probe: Mechanic;
  amount: number;
}
