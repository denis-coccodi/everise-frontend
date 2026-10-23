import { Service } from '@angular/core';
import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import { planHeals } from './heal-plan';
import { healPower } from './heal-power';
import { healPairings, healTools } from './heal-tools';
import { HealingBuffs, healingBuffsOf } from './healing-buffs';
import { playedInvulnerabilities } from './invulnerabilities';
import { mechanicsOf } from './mechanics';
import { planMitigation } from './mitigation-plan';
import { playedUses } from './played-uses';
import { Weaving } from './weaving';
import { InvulnerabilityOptions, Plan, PlanOptions, PlannedUse } from './plan.model';
import { mitigationTools } from './tools';

// Plans of the pull, at most: the first, and replans around the HP its
// heals leave.
const ROUNDS = 3;

// Plans a pull in the browser. The planner page loads it only when it's
// asked for (injectAsync), keeping it out of the page's own bundle.
@Service()
export class PlannerScheduler {
  // The party's mitigations and shields over the pull, then the healers'
  // heals, every hit left the margin of the player's HP where the party's
  // cooldowns allow. The mitigations are planned first as if every hit
  // landed at full HP; where a hit is still short, again around the HP the
  // heals leave it, then the heals again, as long as that makes the plan
  // better. Only the players `asked` to replan are planned, the others as
  // they played; the tanks' invulnerabilities go where `asked` says, or
  // where the pull had them.
  plan(timeline: PullTimeline, catalog: ActionCatalog, asked: PlanOptions): Plan {
    const maxHp = new Map<number, number>();
    for (const player of timeline.players) if (player.maxHp) maxHp.set(player.id, player.maxHp);
    const replanned = (t: { player: number }) => !asked.replan || asked.replan.includes(t.player);
    const power = healPower(timeline, catalog);
    const mitigation = mitigationTools(timeline.players, catalog, power);
    // The others' heals stay in the pull's healing, as played.
    const heals = healTools(timeline.players, catalog, mitigation, power).filter(replanned);
    const fixed = playedUses(
      timeline,
      mitigation.filter((t) => !replanned(t)),
    );
    const mechanics = mechanicsOf(timeline);
    const buffs = healingBuffsOf(catalog);
    const options: PlanOptions = {
      ...asked,
      invulnerabilities: (asked.invulnerabilities ?? playedInvulnerabilities(timeline, mechanics, mitigation)).filter(
        replanned,
      ),
    };
    // The oGCDs that only pay with a GCD heal (Plenary Indulgence) are
    // planned with one, by the heals, never on their own.
    const pairings = healPairings(timeline.players, catalog, power).filter(replanned);
    const key = (t: { player: number; action: number }) => `${t.player}:${t.action}`;
    const paired = new Set(pairings.map(key));
    const alone = mitigation.filter((t) => !paired.has(key(t)));
    // Where each player can act: their GCDs as played, and the oGCDs they
    // used that the plan doesn't schedule.
    const scheduled = new Set([...mitigation.filter(replanned), ...heals, ...pairings].map(key));
    const weaving = Weaving.of(timeline, catalog, (player, action) => scheduled.has(`${player}:${action}`));
    // A GCD shield grows with its caster's healing potency buffs: those the
    // plan has up when it's cast, and the rest as played.
    const party = timeline.players.map((p) => p.id);
    const potency = new HealingBuffs(buffs, party, timeline, new Set([...mitigation, ...heals, ...pairings].map(key)));
    const shieldTimes = (use: PlannedUse, uses: PlannedUse[]) => potency.potencyAt(use.player, use.at, uses);
    const once = (from?: Plan) =>
      planHeals(
        planMitigation(mechanics, alone, maxHp, options, from, fixed, weaving, shieldTimes),
        timeline,
        mitigation,
        heals,
        maxHp,
        options,
        buffs,
        weaving,
        pairings,
      );

    let best = once();
    for (let round = 1; round < ROUNDS && best.hits.some((h) => !h.safe); round++) {
      const next = once(best);
      if (!better(next, best, maxHp, options)) break;
      best = next;
    }
    return best;
  }

  // What the plan's options offer for the tanks' invulnerabilities.
  invulnerabilityOptions(timeline: PullTimeline, catalog: ActionCatalog): InvulnerabilityOptions {
    const tools = mitigationTools(timeline.players, catalog).filter((t) => t.effects.some((e) => e.invulnerable));
    const mechanics = mechanicsOf(timeline);
    return {
      tools: tools.map(({ player, action, name }) => ({ player, action, name })),
      mechanics: mechanics.map((m) => ({ id: m.id, at: m.at, name: m.name, players: m.hits.map((h) => h.player) })),
      played: playedInvulnerabilities(timeline, mechanics, tools),
    };
  }
}

// Fewer hits short of the margin, or as many but short by less.
function better(a: Plan, b: Plan, maxHp: Map<number, number>, options: PlanOptions) {
  const score = (plan: Plan) => {
    const short = plan.hits.filter((h) => !h.safe);
    const by = short.reduce((sum, h) => {
      const margin = options.margin * (maxHp.get(h.player) ?? 0);
      return sum + Math.max(0, margin - ((h.hpBefore ?? 0) - h.planned));
    }, 0);
    return { count: short.length, by };
  };
  const [x, y] = [score(a), score(b)];
  return x.count < y.count || (x.count === y.count && x.by < y.by);
}
