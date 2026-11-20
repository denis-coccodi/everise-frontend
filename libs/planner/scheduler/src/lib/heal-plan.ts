import { PullTimeline } from '@everise/core/api-types';
import type { MpModel } from './mp';
import { KARDIA } from './heal-tools';
import { ROLE_HEALS } from './role-heals';
import { readHoroscope } from './horoscope-read';
import { projected, pullFacts, reaches } from './coverage';
import { AutoDamage } from './auto-damage';
import { delayedEvents } from './delayed-heals';
import { HealingBuffs } from './healing-buffs';
import {
  NO_ROOM_MS,
  aheadOf,
  best,
  better,
  kardiaBack,
  madeUp,
  movedAway,
  waitsForBiggerNeed,
} from './heal-candidates';
import { bonded, pairingsFor } from './paired-heals';
import { MISERY, aimedHeals, miserySpent, spareHeals } from './spare-heals';
import { WEAVE_MS, Weaving } from './weaving';
import { guardsOf, naturalRegen, pullEvents } from './hp-events';
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
  PlannedUse,
} from './plan.model';
import { AUTOMATIC } from './tools';
import { tankBuffs } from './tank-buffs';
import type { Candidate, FairyHealing, Spent } from './heal-plan.model';
import type { HealingBuff } from './healing-buffs.model';
import type { HpCheckpoint, HpEvent } from './hp-track.model';
import { anchors, coveredMechanics, healCheckpoints } from './damage-checks';
import { hitDamage } from './hit-damage';
import { raidwideShields } from './raidwide-shields';
import { hpBefores, judgedHits } from './judged-hits';
import { mpShares, refillTargets, refillsBefore, refillWorth } from './heal-refill';
import { barrierFor, barrierWorth, healOnly, pairedWithBarrier, withBarriers } from './barrier-worth';
import { inPlanningOrder } from './hard-first';

// The heals planned for one mechanic, at most.
const HEALS_PER_MECHANIC = 8;
const MACROCOSMOS = 25874;

// The healers' heals planned over the pull, after the mitigations and shields: in time order, before each mechanic,
// enough heals that every hit leaves the margin of the HP its player has then (as far as the healers' cooldowns
// allow), oGCDs first, each heal times the healing `buffs` (by action) up for it, and where its healer can act
// (`weaving`): an oGCD in a weave slot, a GCD in place of one of theirs. A GCD heal can go with the oGCD that pays
// only with one (`pairings`: Plenary Indulgence before a Medica), the two planned together. A replanned scholar's
// fairy heals as `fairy` works out, in place of hers in the pull. The mechanics `first` (`hardFirst`) are healed
// before the others, every tool open to them. Then each hit is judged by the HP it leaves.
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
  mp?: MpModel,
  refill = false,
  aimed = false,
  first = new Set<number>(),
): Plan {
  const key = (t: { player: number; action: number }) => `${t.player}:${t.action}`;
  const healOf = new Map(heals.map((t) => [key(t), t]));
  const mitigationOf = new Map(mitigation.map((t) => [key(t), t]));
  const party = timeline.players.map((p) => p.id);
  const healers = new Set(timeline.players.filter((p) => p.role === 'healer').map((p) => p.id));
  // The healers' heals, a DPS's (Lux Solaris...) and a tank's own (Equilibrium...); Nascent Flash's are its mitigation's.
  // Healing at first need (`healsFirstNeed`), Macrocosmos counts as the damage spell it is.
  const firstNeed = !!options.strategy?.healsFirstNeed;
  const planned = heals
    .filter((t) => healers.has(t.player) || ROLE_HEALS.has(t.action))
    .map((t) => (firstNeed && t.action === MACROCOSMOS ? { ...t, cost: 'neutral' as const } : t));
  // Every healer favours healing where the strategy says so (`healersHeal`), else damage.
  const favourOf = (): Favour => (options.strategy?.healersHeal ? 'healing' : 'dps');
  const scheduled = new Set([...healOf.keys(), ...mitigationOf.keys(), ...pairings.map(key)]);
  const boosts = new HealingBuffs(buffs, party, timeline, scheduled);
  for (const use of plan.uses) boosts.add(use);
  // A GCD shield grows with its caster's healing potency buffs. The autos take the plan's mitigations and shields.
  const facts = pullFacts(plan.mechanics, maxHp, (use) => boosts.potencyAt(use.player, use.at, []) * (use.boost ?? 1));
  const guards = guardsOf(plan.uses, (u) => mitigationOf.get(key(u)));
  const autos = new AutoDamage(timeline, plan.uses, (u) => mitigationOf.get(key(u)), facts);
  const dealt = autos.amountOf;
  const track = new HpTrack(maxHp, [
    ...pullEvents(timeline, plan.mechanics, plan.hits, heals, fairy.recalculated, guards, dealt),
    ...naturalRegen(timeline),
    ...fairy.events,
  ]);
  const hitAt = new Map<number, number[]>();
  for (const m of plan.mechanics) for (const h of m.hits) hitAt.set(h.player, [...(hitAt.get(h.player) ?? []), m.at]);
  const hitTimes = (player: number, from: number, to: number) =>
    (hitAt.get(player) ?? []).filter((at) => at > from && at <= to).sort((a, b) => a - b);
  // The HP a use heals, and when, as the pull goes on (a delayed heal's).
  const eventsFor = (tool: HealTool, use: PlannedUse, delayMs: number) => {
    const own = boosts.boost(delayedEvents(tool, use, delayMs, party, maxHp, track, hitTimes), use, tool.gcd);
    return [...own, ...movedAway(timeline, tool, use), ...bonded(pairings, [...uses, ...plan.uses], tool, use, own)];
  };
  // A pairing's own heal (Physis II's regen), at once: none without one.
  const eventsOfOwn = (own: HealTool | undefined, use: PlannedUse) => (own ? eventsFor(own, use, 0) : []);
  const spent: Spent[] = [];
  const uses: PlannedUse[] = [];
  for (const use of plan.uses) {
    const mitigationTool = mitigationOf.get(key(use));
    const tool = mitigationTool ?? healOf.get(key(use)); // A heal an opener has (Assize) counts too.
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
  // The healing buffs on the tanks (the Arrow, Protraction) first: the heals after count them.
  uses.push(...tankBuffs(planned, spent, weaving, plan.mechanics, timeline.players));
  for (const use of uses) boosts.add(use);
  // What each hit takes, which need no healing for, and what lands with each.
  const { invulnerable, damage, damageOf, together } = hitDamage(plan);
  // The mechanics, with Living Dead's and the damage outside them (damage over time, auto-attacks).
  const { deads, mechanics } = healCheckpoints(plan, timeline, maxHp, options.margin, weaving, mitigationOf, dealt);
  for (const dead of deads) track.add(dead.selfHeals);
  // What each mechanic takes of the party, in shares of HP, mitigated.
  const need = new Map<number, number>();
  for (const h of plan.hits) if (!h.avoidable) need.set(h.mechanic, (need.get(h.mechanic) ?? 0) + (h.share ?? 0));
  const needOf = (m: Mechanic) => need.get(m.id) ?? 0;
  // The mitigations up: the plan's, and the heals picked here that also mitigate (Kerachole, Holos, Temperance).
  const mitigating = plan.uses.filter((u) => mitigationOf.has(key(u)));
  const toolOfUse = (u: PlannedUse) => mitigationOf.get(key(u)) as MitigationTool;
  // What may refill to full before each mechanic, and the raidwides that want shields too.
  const casters = heals.map((t) => t.player);
  const up = (o: Mechanic, hit: MechanicHit) => projected(o, hit, mitigating, toolOfUse, facts);
  const shields = raidwideShields(plan, maxHp, casters, options, damageOf, up);
  const { refills, shieldFor, unshielded, forget } = shields;
  // Such a heal lowers the hits it reaches, and the HP track gets back what they no longer take.
  const mitigate = (use: PlannedUse, tool: MitigationTool) => {
    mitigating.push(use);
    forget();
    track.add(autos.add(use));
    for (const m of plan.mechanics) {
      for (const h of m.hits) {
        if (!reaches(tool, use, m, h).length) continue;
        const was = damageOf(m, h);
        const now = projected(m, h, mitigating, toolOfUse, facts).damage;
        if (now >= was) continue;
        damage.set(`${m.id}:${h.player}`, now);
        track.add([{ at: m.at, player: h.player, amount: was - now, back: true }]);
        if (!use.covers.includes(m.id)) use.covers.push(m.id);
      }
    }
  };

  // A GCD shield is weighed with what its barrier saves, a pairing's barrier too.
  const barrierOf = barrierWorth(mitigationOf, plan.mechanics, mitigating, toolOfUse, facts);
  const mpShare = mpShares(mp);
  // What the healers use anyway: the heals on cooldown, and the lily that would overcap (`aimedHeals`: in the last pass, `aimed`).
  const eventsOf = (t: HealTool, u: PlannedUse, delayMs = 0) => eventsFor(t, u, delayMs);
  const spareOnes = (spare = spareHeals(planned, spent, weaving, timeline.durationMs, favourOf, eventsOf)) => {
    track.add(spare.events);
    uses.push(...spare.uses);
  };
  // First what keeps every hit above the margin, and the heals used anyway; then (`refill`) everyone refilled to full before each of the pull's mechanics, with what all those leave and MP to spare.
  let needed: Map<string, number> | undefined;
  for (const full of refill ? [false, true] : [false]) {
    if (full) {
      spareOnes();
      needed = hpBefores(plan, track, together);
    }
    for (const m of full ? mechanics : inPlanningOrder(mechanics, first)) {
      if (full && m.id < 0) continue;
      // Healing from after the last mechanic there was time to heal after (`anchors`: not others' checks).
      const anchor = mechanics.filter((o) => o.at <= m.at - NO_ROOM_MS - WEAVE_MS && anchors(m, o)).at(-1)?.at ?? -1;
      // What those `o` hits lack before it, from the anchor on (none under an invulnerability): to
      // leave the margin, or (`full`) to land on full HP, and shielded before a heavy raidwide.
      const shortOf = (o: Mechanic, full = false) => {
        const checkpoints = o.hits
          .filter((h) => !invulnerable.has(`${o.id}:${h.player}`))
          .map((h) => track.checkpoint(h.player, anchor))
          .filter((c): c is HpCheckpoint => c !== null);
        return (extra: HpEvent[] = []) =>
          new Map(
            checkpoints.map((c) => {
              const max = maxHp.get(c.player) as number;
              const hit = o.hits.find((h) => h.player === c.player) as MechanicHit;
              const need = full ? max : Math.min(max, damageOf(o, hit) + options.margin * max);
              const bare = full && shieldFor.has(o.id) ? unshielded(o, hit, extra) : 0;
              return [c.player, need + together(o, c.player) - track.before(c, o.at, extra) + bare];
            }),
          );
      };
      {
        const [deficits, ...later] = [m, ...(full ? [] : aheadOf(m, mechanics))].map((o) => shortOf(o, full));

        for (let n = 0; n < HEALS_PER_MECHANIC; n++) {
          const [short, ...laterShort] = [deficits, ...later].map((f) => f());
          if (![...short.values()].some((d) => d > 0)) break;
          const ahead = (events: HpEvent[]) => laterShort.reduce((sum, s, i) => sum + madeUp(s, later[i](events)), 0);
          const candidateOf = (tool: HealTool) => {
            const eventsOf = (use: PlannedUse, delayMs: number) => [
              ...eventsFor(tool, use, delayMs),
              ...barrierOf(tool, use),
            ];
            const pairWith = (use: PlannedUse, events: HpEvent[]) =>
              pairedWithBarrier(events, (healing) =>
                withBarriers(
                  barrierOf,
                  tool,
                )(
                  pairingsFor(
                    pairings,
                    tool,
                    use,
                    healing,
                    spent.filter((s) => s.player === use.player),
                    (group) => spent.filter((s) => s.group === group).map((s) => s.at),
                    weaving,
                    maxHp,
                    (pairing, paired) => eventsOfOwn(healOf.get(key(pairing)), paired),
                    short,
                    plan.mechanics,
                  ),
                ),
              );
            const own = spent.filter((s) => s.player === tool.player);
            const affordable = (at: number) => !mp || mp.affordable(tool.player, tool.action, at, own);
            const mpWorth = (at: number) => (full ? refillWorth(mpShare(tool.player, own)(at)) : 1);
            const args = [deficits, weaving, pairWith, favourOf, affordable, ahead, mpWorth] as const;
            return best(tool, m, anchor, full ? refillTargets(short, tool, timeline) : short, spent, eventsOf, ...args);
          };
          const among = (tools: HealTool[]) =>
            tools.map(candidateOf).reduce<Candidate | null>((a, c) => (c && (!a || better(c, a)) ? c : a), null);
          // A long cooldown waits for the bigger stretch ahead, unless nothing else is left.
          const waits = (t: HealTool) => !firstNeed && !first.has(m.id) && waitsForBiggerNeed(t, m, mechanics, needOf);
          const pick = full
            ? among(planned.filter((t) => refills(m.id, t)))
            : (among(planned.filter((t) => !waits(t))) ?? among(planned));
          if (!pick) break;
          track.add(healOnly(pick.events));
          uses.push(pick.use);
          boosts.add(pick.use);
          // A shield Emergency Tactics turns into healing goes up as none.
          if (pick.paired?.pairing.shields) pick.use.boost = pick.paired.pairing.times;
          const mitigates = mitigationOf.get(key(pick.use));
          if (mitigates && !pick.paired?.pairing.converts) mitigate(pick.use, mitigates);
          if (pick.paired) {
            const { barrier } = pick.paired; // Neutral Sect's barrier, a shield for the hits after.
            if (barrier) {
              mitigationOf.set(key(barrier.use), barrier.tool);
              mitigate(barrier.use, barrier.tool);
            }
          }
          if (pick.paired && !pick.paired.open) {
            const { use, pairing } = pick.paired;
            uses.push(use);
            boosts.add(use);
            const confession = mitigationOf.get(key(use));
            if (confession) mitigate(use, confession);
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
            const release = { action: delayed.release.action, group: `release:${pick.use.player}`, pool: null };
            spent.push({ player: pick.use.player, ...release, at: lands, gcd: false, castMs: 0 });
          }
          const { group, pool, gcd, castMs } = pick.tool;
          spent.push({ player: pick.use.player, action: pick.use.action, at: pick.use.at, group, pool, gcd, castMs });
          readHoroscope(pick, uses, spent, weaving);
          // A moved Kardia goes back on its holder afterwards: another press.
          if (pick.tool.action === KARDIA) {
            const { player, at } = pick.use;
            const holder = pick.tool.kardion?.find((s) => s.from <= at && at < s.to)?.player ?? null;
            const back = kardiaBack(
              player,
              at,
              weaving,
              spent.filter((s) => s.player === player),
            );
            if (back !== null) {
              uses.push({ ...pick.use, at: back, target: holder, covers: [], again: 'kardia' });
              spent.push({
                player,
                action: KARDIA,
                at: back,
                group: `back:${player}`,
                pool: null,
                gcd: false,
                castMs: 0,
              });
            }
          }
        }
      }
    }
  }
  if (!refill) spareOnes();
  if (aimed) spareOnes(aimedHeals(planned, spent, weaving, eventsOf, plan.mechanics));
  if (aimed) uses.push(...tankBuffs(planned, spent, weaving, plan.mechanics, timeline.players, true));

  const hits = judgedHits(plan, maxHp, options.margin, track, deads, damage, together, {
    uses: mitigating,
    toolOf: toolOfUse,
    facts,
    needed,
  });
  // A heal for Walking Dead is for the hit that set it off.
  for (const use of uses) use.covers = coveredMechanics(use.covers, deads);
  return {
    mechanics: plan.mechanics,
    uses: [...plan.uses, ...uses].sort((a, b) => a.at - b.at || a.player - b.player),
    hits,
    unplaced: plan.unplaced,
    hp: party.map((player) => ({ player, points: track.points(player) })),
  };
}
