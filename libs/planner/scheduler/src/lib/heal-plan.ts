import { PullTimeline } from '@everise/core/api-types';
import { fitsGrant, fitsPool, fitsRecast, poolFull, projected, pullFacts, reaches } from './coverage';
import { delayedEvents } from './delayed-heals';
import { HealingBuffs } from './healing-buffs';
import { pairingsFor } from './paired-heals';
import { spareHeals } from './spare-heals';
import { Weaving } from './weaving';
import { pullEvents } from './hp-events';
import { HpTrack } from './hp-track';
import {
  Favour,
  HealCost,
  HealPairing,
  HealTool,
  Mechanic,
  MechanicHit,
  MitigationTool,
  Plan,
  PlanOptions,
  PlannedHit,
  PlannedUse,
  ToolPool,
} from './plan.model';
import type { Candidate, Paired, Spent } from './heal-plan.model';
import type { HealingBuff } from './healing-buffs.model';
import type { HpCheckpoint, HpEvent } from './hp-track.model';

// A heal lands at least this long before the hit it's for, and at least
// this long after the hits before it.
const LEAD_MS = 500;
const AFTER_MS = 1000;
// Mechanics this close together are healed for at once: there's no time to
// heal between them.
const GAP_MS = 2000;
// What a heal's healing is worth for what it costs (`HealCost`): a free
// oGCD first, then one spending Aetherflow, a GCD that costs no damage
// (Afflatus Solace), then any other GCD, which costs a GCD of damage. One
// whose pool is full costs nothing, so it goes before the free ones: lilies
// and Addersgall are spent rather than left to overcap. A healer favouring
// healing over damage (`Favour`) minds a GCD's damage less.
const WORTH: Record<Favour, Record<HealCost, number>> = {
  dps: { free: 1, resource: 0.85, neutral: 0.8, gcd: 0.4 },
  healing: { free: 1, resource: 0.95, neutral: 0.9, gcd: 0.8 },
};
const FULL_WORTH = 1.05;
// The heals planned for one mechanic, at most.
const HEALS_PER_MECHANIC = 8;

// The healers' heals planned over the pull, after the mitigations and
// shields: in time order, before each mechanic, enough heals that every hit
// leaves the margin of the HP its player has then (as far as the healers'
// cooldowns allow), oGCDs first, each heal times the healing `buffs` (by
// action) up for it, and where its healer can act (`weaving`): an oGCD in a
// weave slot, a GCD in place of one of theirs. A GCD heal can go with the
// oGCD that pays only with one (`pairings`: Plenary Indulgence before a
// Medica), the two planned together. Then each hit is judged by the HP it
// leaves.
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
): Plan {
  const key = (t: { player: number; action: number }) => `${t.player}:${t.action}`;
  const healOf = new Map(heals.map((t) => [key(t), t]));
  const mitigationOf = new Map(mitigation.map((t) => [key(t), t]));
  const party = timeline.players.map((p) => p.id);
  const healers = new Set(timeline.players.filter((p) => p.role === 'healer').map((p) => p.id));
  const planned = heals.filter((t) => healers.has(t.player));
  const favourOf = (player: number): Favour => options.favour?.[player] ?? 'dps';

  const track = new HpTrack(maxHp, pullEvents(timeline, plan.mechanics, plan.hits, heals));
  const hitAt = new Map<number, number[]>();
  for (const m of plan.mechanics) for (const h of m.hits) hitAt.set(h.player, [...(hitAt.get(h.player) ?? []), m.at]);
  const hitTimes = (player: number, from: number, to: number) =>
    (hitAt.get(player) ?? []).filter((at) => at > from && at <= to).sort((a, b) => a - b);
  const scheduled = new Set([...healOf.keys(), ...mitigationOf.keys(), ...pairings.map(key)]);
  const boosts = new HealingBuffs(buffs, party, timeline, scheduled);
  for (const use of plan.uses) boosts.add(use);
  // The HP a use heals, and when, as the pull goes on (a delayed heal's).
  const eventsFor = (tool: HealTool, use: PlannedUse, delayMs: number) =>
    boosts.boost(delayedEvents(tool, use, delayMs, party, maxHp, track, hitTimes), use, tool.gcd);
  const spent: Spent[] = [];
  for (const use of plan.uses) {
    const tool = mitigationOf.get(key(use));
    if (tool) {
      spent.push({
        player: use.player,
        action: use.action,
        at: use.at,
        group: tool.group,
        pool: tool.pool,
        gcd: tool.gcd,
        castMs: tool.castMs,
      });
      // Superbolide takes its user down to 1 HP.
      if (tool.effects.some((e) => e.invulnerable === 'dropsToOne')) {
        track.add([{ at: use.at, player: use.player, amount: -(maxHp.get(use.player) ?? 0), floor: 1 }]);
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
  const mechanics = [...plan.mechanics].sort((a, b) => a.at - b.at);

  // The mitigations up: the plan's, and the heals picked here that also
  // mitigate (Kerachole, Holos, Temperance).
  const facts = pullFacts(plan.mechanics, maxHp);
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
          );
        const candidate = best(tool, m, anchor, short, spent, eventsOf, deficits, weaving, pairWith, favourOf);
        if (candidate && (!pick || better(candidate, pick))) pick = candidate;
      }
      if (!pick) break;
      track.add(pick.events);
      uses.push(pick.use);
      boosts.add(pick.use);
      const mitigates = mitigationOf.get(key(pick.use));
      if (mitigates) mitigate(pick.use, mitigates);
      if (pick.paired) {
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
    const safe = hit.invulnerable || hit.avoidable || hpBefore - hit.planned >= options.margin * max - 1;
    return { ...hit, hpBefore, safe };
  });
  return {
    mechanics: plan.mechanics,
    uses: [...plan.uses, ...uses].sort((a, b) => a.at - b.at || a.player - b.player),
    hits,
    unplaced: plan.unplaced,
  };
}

// The most a use of `tool` can make up of the deficits before `m`, at the
// earliest moment it can heal after the anchor or as late as it can (a
// delayed heal with each of its delays, the one that needs nothing more
// first); null when it can't be used or helps no one short.
function best(
  tool: HealTool,
  m: Mechanic,
  anchor: number,
  short: Map<number, number>,
  spent: Spent[],
  eventsOf: (use: PlannedUse, delayMs: number) => HpEvent[],
  deficits: (extra: HpEvent[]) => Map<number, number>,
  weaving: Weaving,
  pairWith: (use: PlannedUse, events: HpEvent[]) => Paired[],
  favourOf: (player: number) => Favour,
): Candidate | null {
  const latest = m.at - LEAD_MS;
  const earliest = Math.min(latest, Math.max(0, anchor + AFTER_MS));
  if (latest <= anchor) return null;
  const times = spent.filter((s) => s.group === tool.group).map((s) => s.at);
  const pooled = tool.pool ? spent.filter((s) => s.player === tool.player && s.pool?.name === tool.pool?.name) : [];
  const occupied = spent.filter((s) => s.player === tool.player);
  const timesOf = (action: number) =>
    spent.filter((s) => s.player === tool.player && s.action === action).map((s) => s.at);
  // A heal on one member goes to whoever is shortest.
  const target = tool.effects.some((e) => e.target === 'target')
    ? [...short].reduce((a, b) => (b[1] > a[1] ? b : a))[0]
    : null;
  let found: Candidate | null = null;
  const end = tool.delayed?.delaysMs[0] ?? 0;
  // Each moment as early or as late as it can be, then where the healer can
  // act: the first chance from it on, or the last up to it.
  const moments =
    tool.delayed?.belowShare != null
      ? // A triggered heal goes up before the hit that sets it off: the last
        // mechanic's, or one after it.
        [...new Set([anchor - LEAD_MS, earliest])].map((up) => ({ at: up - tool.castMs, delayMs: end, late: true }))
      : [...new Set([earliest, latest])].flatMap((lands) =>
          (tool.delayed?.delaysMs ?? [0]).map((delayMs) => ({
            at: lands - tool.castMs - delayMs,
            delayMs,
            late: lands === latest,
          })),
        );
  for (const moment of moments) {
    const { delayMs } = moment;
    const lo = Math.max(0, earliest - tool.castMs - delayMs);
    const hi = latest - tool.castMs - delayMs;
    const at = tool.gcd
      ? moment.late
        ? weaving.gcdBefore(tool.player, moment.at, lo, tool.castMs, occupied)
        : weaving.gcdAfter(tool.player, moment.at, hi, tool.castMs, occupied)
      : moment.late
        ? weaving.ogcdBefore(tool.player, moment.at, lo, occupied)
        : weaving.ogcdAfter(tool.player, moment.at, hi, occupied);
    if (at === null || at < 0 || !fitsRecast(times, at, tool.recastMs, tool.charges)) continue;
    if (
      tool.pool &&
      !fitsPool(
        pooled.map((s) => s.at),
        at,
        tool.pool,
      )
    )
      continue;
    const { grantedBy } = tool;
    if (grantedBy && !fitsGrant(timesOf(tool.action), timesOf(grantedBy.action), at, grantedBy)) continue;
    const use: PlannedUse = { player: tool.player, action: tool.action, name: tool.name, at, target, covers: [m.id] };
    const full =
      tool.pool &&
      poolFull(
        pooled.map((s) => s.at),
        at,
        tool.pool,
      );
    const worth = full ? FULL_WORTH : WORTH[favourOf(tool.player)][tool.cost];
    // On its own, or with each oGCD that can go with it.
    const alone = eventsOf(use, delayMs);
    const options = [
      { events: alone, paired: null },
      ...pairWith(use, alone).map((p) => ({ events: p.events, paired: p })),
    ];
    for (const { events, paired } of options) {
      const after = deficits(events);
      let value = 0;
      for (const [player, deficit] of short) {
        if (deficit > 0) value += deficit - Math.max(0, after.get(player) ?? deficit);
      }
      value *= worth;
      if (value > 0 && (!found || value > found.value)) found = { use, tool, events, value, delayMs, paired };
    }
  }
  return found;
}

// The most made up; on a tie, the cooldown that comes back soonest.
function better(a: Candidate, b: Candidate) {
  return a.value > b.value || (a.value === b.value && a.tool.recastMs < b.tool.recastMs);
}
