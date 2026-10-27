import { PullTimeline } from '@everise/core/api-types';
import { DPS_HEALS, KARDIA, KARDIA_HEAL, KARDIA_HEALS, TICK_MS } from './heal-tools';
import { projected, pullFacts, reaches } from './coverage';
import { delayedEvents } from './delayed-heals';
import { HealingBuffs } from './healing-buffs';
import { best, better } from './heal-candidates';
import { pairingsFor } from './paired-heals';
import { MISERY, miserySpent, spareHeals } from './spare-heals';
import { walkingDeads } from './walking-dead';
import { Weaving } from './weaving';
import { naturalRegen, pullEvents } from './hp-events';
import { HpTrack } from './hp-track';
import {
  Favour,
  HealPairing,
  HealTool,
  Mechanic,
  MechanicHit,
  MitigationTool,
  Plan,
  PlanOptions,
  PlannedHit,
  PlannedUse,
} from './plan.model';
import { AUTOMATIC } from './tools';
import type { Candidate, FairyHealing, Spent } from './heal-plan.model';
import type { HealingBuff } from './healing-buffs.model';
import type { HpCheckpoint, HpEvent } from './hp-track.model';

// Mechanics this close together are healed for at once: there's no time to
// heal between them. A second is time for an oGCD heal (a burst's hits come
// about that far apart).
const GAP_MS = 1000;
// The heals planned for one mechanic, at most.
const HEALS_PER_MECHANIC = 8;

// The healers' heals planned over the pull, after the mitigations and
// shields: in time order, before each mechanic, enough heals that every hit
// leaves the margin of the HP its player has then (as far as the healers'
// cooldowns allow), oGCDs first, each heal times the healing `buffs` (by
// action) up for it, and where its healer can act (`weaving`): an oGCD in a
// weave slot, a GCD in place of one of theirs. A GCD heal can go with the
// oGCD that pays only with one (`pairings`: Plenary Indulgence before a
// Medica), the two planned together. A replanned scholar's fairy heals as
// `fairy` works out, in place of hers in the pull. Then each hit is judged
// by the HP it leaves.
export function planHeals(
  plan: Plan,
  timeline: PullTimeline,
  mitigation: MitigationTool[],
  heals: HealTool[],
  maxHp: Map<number, number>,
  options: PlanOptions,
  buffs = new Map<number, HealingBuff[]>(),
  weaving = new Weaving(),
  pairings: HealPairing[] = [],
  fairy: FairyHealing = { events: [], recalculated: [] },
): Plan {
  const key = (t: { player: number; action: number }) => `${t.player}:${t.action}`;
  const healOf = new Map(heals.map((t) => [key(t), t]));
  const mitigationOf = new Map(mitigation.map((t) => [key(t), t]));
  const party = timeline.players.map((p) => p.id);
  const healers = new Set(timeline.players.filter((p) => p.role === 'healer').map((p) => p.id));
  // The healers' heals, and a replanned DPS's (Lux Solaris...); the others'
  // heals (a tank's Nascent Flash) are their mitigation's.
  const planned = heals.filter((t) => healers.has(t.player) || DPS_HEALS.has(t.action));
  const favourOf = (player: number): Favour => options.favour?.[player] ?? 'dps';

  const track = new HpTrack(maxHp, [
    ...pullEvents(timeline, plan.mechanics, plan.hits, heals, fairy.recalculated),
    ...naturalRegen(timeline),
    ...fairy.events,
  ]);
  const hitAt = new Map<number, number[]>();
  for (const m of plan.mechanics) for (const h of m.hits) hitAt.set(h.player, [...(hitAt.get(h.player) ?? []), m.at]);
  const hitTimes = (player: number, from: number, to: number) =>
    (hitAt.get(player) ?? []).filter((at) => at > from && at <= to).sort((a, b) => a - b);
  const scheduled = new Set([...healOf.keys(), ...mitigationOf.keys(), ...pairings.map(key)]);
  const boosts = new HealingBuffs(buffs, party, timeline, scheduled);
  for (const use of plan.uses) boosts.add(use);
  // The HP a use heals, and when, as the pull goes on (a delayed heal's).
  const eventsFor = (tool: HealTool, use: PlannedUse, delayMs: number) => [
    ...boosts.boost(delayedEvents(tool, use, delayMs, party, maxHp, track, hitTimes), use, tool.gcd),
    ...movedAway(tool, use),
  ];
  // Kardia moved: the Kardion heals its holder had as played meanwhile.
  const movedAway = (tool: HealTool, use: PlannedUse): HpEvent[] => {
    if (tool.action !== KARDIA) return [];
    const to = use.at + KARDIA_HEALS * TICK_MS;
    return timeline.heals
      .filter((h) => h.source === use.player && h.status === KARDIA_HEAL && h.target !== use.target)
      .filter((h) => h.at > use.at && h.at <= to)
      .map((h) => ({ at: h.at, player: h.target, amount: -h.amount }));
  };
  const spent: Spent[] = [];
  for (const use of plan.uses) {
    const mitigationTool = mitigationOf.get(key(use));
    // A heal an opener has (Assize) counts too.
    const tool = mitigationTool ?? healOf.get(key(use));
    // An opener's Afflatus Misery takes its GCD and the Blood Lily.
    if (use.action === MISERY.action) spent.push(miserySpent(use.player, use.at));
    // A pet's own cast (Seraphic Veil) takes none of its owner's time.
    if (tool && !AUTOMATIC.has(use.action)) {
      spent.push({
        player: use.player,
        action: use.action,
        at: use.at,
        group: tool.group,
        pool: tool.pool,
        gcd: tool.gcd,
        castMs: tool.castMs,
      });
      // Superbolide takes half its user's max HP off (to 1 HP at least).
      if (mitigationTool?.effects.some((e) => e.invulnerable === 'halvesHp')) {
        track.add([{ at: use.at, player: use.player, amount: -(maxHp.get(use.player) ?? 0) / 2, floor: 1 }]);
      }
    }
    const heal = healOf.get(key(use));
    // A mitigation that heals later (Exaltation) heals when it ends.
    if (heal) track.add(eventsFor(heal, use, heal.delayed?.delaysMs[0] ?? 0));
  }
  const uses: PlannedUse[] = [];
  // Hits that need no healing for: under an invulnerability, or avoided.
  const invulnerable = new Set(
    plan.hits.filter((h) => h.invulnerable || h.avoidable).map((h) => `${h.mechanic}:${h.player}`),
  );
  const damage = new Map(plan.hits.map((h) => [`${h.mechanic}:${h.player}`, h.planned]));
  const damageOf = (m: Mechanic, h: MechanicHit) => damage.get(`${m.id}:${h.player}`) ?? h.unmitigated;
  // Living Dead: the tank must be full again when Walking Dead ends.
  const deads = walkingDeads(plan, (u) => mitigationOf.get(key(u)), maxHp, options.margin, weaving);
  for (const dead of deads) track.add(dead.selfHeals);
  const mechanics = [...plan.mechanics, ...deads.map((d) => d.check)].sort((a, b) => a.at - b.at);

  // The mitigations up: the plan's, and the heals picked here that also
  // mitigate (Kerachole, Holos, Temperance).
  // A GCD shield grows with its caster's healing potency buffs.
  const facts = pullFacts(plan.mechanics, maxHp, (use) => boosts.potencyAt(use.player, use.at, []));
  const mitigating = plan.uses.filter((u) => mitigationOf.has(key(u)));
  const toolOfUse = (u: PlannedUse) => mitigationOf.get(key(u)) as MitigationTool;
  // Such a heal lowers the hits it reaches, and the HP track gets back what
  // they no longer take.
  const mitigate = (use: PlannedUse, tool: MitigationTool) => {
    mitigating.push(use);
    for (const m of plan.mechanics) {
      for (const h of m.hits) {
        if (!reaches(tool, use, m, h).length) continue;
        const was = damageOf(m, h);
        const now = projected(m, h, mitigating, toolOfUse, facts).damage;
        if (now >= was) continue;
        damage.set(`${m.id}:${h.player}`, now);
        track.add([{ at: m.at, player: h.player, amount: was - now }]);
        if (!use.covers.includes(m.id)) use.covers.push(m.id);
      }
    }
  };

  for (const m of mechanics) {
    // Healing from after the last mechanic there was time to heal after.
    const anchor = mechanics.filter((o) => o.at <= m.at - GAP_MS).at(-1)?.at ?? -1;
    // A hit an invulnerability is up for needs no healing for.
    const checkpoints = m.hits
      .filter((h) => !invulnerable.has(`${m.id}:${h.player}`))
      .map((h) => track.checkpoint(h.player, anchor))
      .filter((c): c is HpCheckpoint => c !== null);
    const deficits = (extra: HpEvent[] = []) =>
      new Map(
        checkpoints.map((c) => {
          const max = maxHp.get(c.player) as number;
          const hit = m.hits.find((h) => h.player === c.player) as MechanicHit;
          const need = Math.min(max, damageOf(m, hit) + options.margin * max);
          return [c.player, need - track.before(c, m.at, extra)];
        }),
      );

    for (let n = 0; n < HEALS_PER_MECHANIC; n++) {
      const short = deficits();
      if (![...short.values()].some((d) => d > 0)) break;
      let pick: Candidate | null = null;
      for (const tool of planned) {
        const eventsOf = (use: PlannedUse, delayMs: number) => eventsFor(tool, use, delayMs);
        const pairWith = (use: PlannedUse, events: HpEvent[]) =>
          pairingsFor(
            pairings,
            tool,
            use,
            events,
            spent.filter((s) => s.player === use.player),
            (group) => spent.filter((s) => s.group === group).map((s) => s.at),
            weaving,
            maxHp,
            (pairing, paired) => {
              const own = healOf.get(key(pairing));
              return own ? eventsFor(own, paired, 0) : [];
            },
          );
        const candidate = best(tool, m, anchor, short, spent, eventsOf, deficits, weaving, pairWith, favourOf);
        if (candidate && (!pick || better(candidate, pick))) pick = candidate;
      }
      if (!pick) break;
      track.add(pick.events);
      uses.push(pick.use);
      boosts.add(pick.use);
      // A shield Emergency Tactics turns into healing goes up as none.
      const mitigates = mitigationOf.get(key(pick.use));
      if (mitigates && !pick.paired?.pairing.converts) mitigate(pick.use, mitigates);
      if (pick.paired) {
        const { use, pairing } = pick.paired;
        uses.push(use);
        boosts.add(use);
        const confession = mitigationOf.get(key(use));
        if (confession) mitigate(use, confession);
        // Neutral Sect's barrier, a shield for the hits after.
        const { barrier } = pick.paired;
        if (barrier) {
          mitigationOf.set(key(barrier.use), barrier.tool);
          mitigate(barrier.use, barrier.tool);
        }
        spent.push({
          player: use.player,
          action: use.action,
          at: use.at,
          group: pairing.group,
          pool: null,
          gcd: false,
          castMs: 0,
        });
      }
      // A delayed heal set off sooner than it goes off on its own.
      const { delayed } = pick.tool;
      if (delayed?.release && pick.delayMs < delayed.delaysMs[0]) {
        const lands = pick.use.at + pick.tool.castMs + pick.delayMs;
        uses.push({ ...pick.use, ...delayed.release, at: lands, target: null, covers: [m.id] });
        // Its weave slot.
        const release = { action: delayed.release.action, group: `release:${pick.use.player}`, pool: null };
        spent.push({ player: pick.use.player, ...release, at: lands, gcd: false, castMs: 0 });
      }
      const { group, pool, gcd, castMs } = pick.tool;
      spent.push({ player: pick.use.player, action: pick.use.action, at: pick.use.at, group, pool, gcd, castMs });
    }
  }

  // What the healers use anyway: the heals on cooldown, and the lily that
  // would overcap.
  const spare = spareHeals(planned, spent, weaving, timeline.durationMs, favourOf, (tool, use) =>
    eventsFor(tool, use, 0),
  );
  track.add(spare.events);
  uses.push(...spare.uses);

  const mechanicOf = new Map(plan.mechanics.map((m) => [m.id, m]));
  // A hit a heal's mitigation lowered, projected again with every
  // mitigation up.
  const lowered = (hit: PlannedHit): PlannedHit => {
    const m = mechanicOf.get(hit.mechanic) as Mechanic;
    const mechanicHit = m.hits.find((h) => h.player === hit.player) as MechanicHit;
    const projection = projected(m, mechanicHit, mitigating, toolOfUse, facts);
    const { damage: planned, absorbed, statuses, invulnerable } = projection;
    const max = maxHp.get(hit.player);
    return { ...hit, planned, absorbed, invulnerable, covers: statuses, share: max ? planned / max : null };
  };
  const hits = plan.hits.map((planned) => {
    const changed = damage.get(`${planned.mechanic}:${planned.player}`) !== planned.planned;
    const hit = changed ? lowered(planned) : planned;
    const start = track.checkpoint(hit.player, -1);
    if (!start) return hit;
    const max = maxHp.get(hit.player) as number;
    const hpBefore = Math.round(track.before(start, mechanicOf.get(hit.mechanic)?.at ?? 0));
    // Under Living Dead, one the tank isn't healed full after dies.
    const dead = deads.find((d) => d.trigger.id === hit.mechanic && d.player === hit.player);
    const healed = !dead || track.before(start, dead.check.at + 1) >= max - 1;
    const safe = (hit.invulnerable && healed) || hit.avoidable || hpBefore - hit.planned >= options.margin * max - 1;
    return { ...hit, hpBefore, safe };
  });
  // A heal for Walking Dead is for the hit that set it off.
  for (const use of uses) use.covers = use.covers.map((id) => deads.find((d) => d.check.id === id)?.trigger.id ?? id);
  return {
    mechanics: plan.mechanics,
    uses: [...plan.uses, ...uses].sort((a, b) => a.at - b.at || a.player - b.player),
    hits,
    unplaced: plan.unplaced,
    hp: party.map((player) => ({ player, points: track.points(player) })),
  };
}
