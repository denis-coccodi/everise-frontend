import { fitsGrant, fitsPool, fitsRecast, isAway, projected, pullFacts, reaches } from './coverage';
import { Mechanic, MechanicHit, MitigationTool, Plan, PlanOptions, PlannedUse } from './plan.model';
import { WEAVE_MS, Weaving } from './weaving';
import { LEAD_MS, burstsOf, momentsFor, mostEndangered, pickBest } from './mitigation-moments';
import type { PullFacts } from './coverage.model';
import type { Candidate, Granted } from './mitigation-plan.model';

// What an avoided hit does.
const AVOIDED = { damage: 0, absorbed: 0, statuses: [], invulnerable: false };
// The spare pass adds at most this many uses to one mechanic.
const SPARE_PER_MECHANIC = 4;
// What a weaponskill or spell is worth next to an oGCD doing as much: it
// costs a GCD the player would deal damage with.
const GCD_WORTH = 0.4;
// How long before a heal Recitation can go up for it.
const RECITATION_MS = 15_000;

// The party's mitigations and shields planned over the pull: the most
// dangerous mechanics first, each given them until every hit leaves the
// margin, so big cooldowns aren't spent early on small hits; then the oGCDs
// left over where they add the most margin. A GCD (Succor, Adloquium...)
// costs damage, so it counts for less and isn't spent on spare margin.
// Each hit is planned as if it landed at full HP; or, replanning `from` an
// earlier plan, on top of its mitigations, at the HP its heals left. Only
// the tools of the players `options.replan` names are planned; the `fixed`
// uses (the others', as played) stay as they are. Each use goes where its
// player can act (`weaving`): an oGCD in a weave slot, a GCD in place of
// one of theirs. A GCD shield grows with its caster's healing potency
// buffs (`shieldTimes`).
export function planMitigation(
  mechanics: Mechanic[],
  tools: MitigationTool[],
  maxHp: Map<number, number>,
  options: PlanOptions,
  from?: Plan,
  fixed: PlannedUse[] = [],
  weaving = new Weaving(),
  shieldTimes?: PullFacts['shieldTimes'],
): Plan {
  const uses: PlannedUse[] = [];
  // The HP each hit lands on, by "<mechanic>:<player>".
  const hpAt = new Map<string, number>();
  for (const hit of from?.hits ?? [])
    if (hit.hpBefore !== null) hpAt.set(`${hit.mechanic}:${hit.player}`, hit.hpBefore);
  const toolOf = new Map<PlannedUse, MitigationTool>();
  const tool = (use: PlannedUse) => toolOf.get(use) as MitigationTool;
  // A use that Recitation made critical: its shields as a critical heal's.
  const critical = (t: MitigationTool) => ({ ...t, effects: t.whenCritical ?? t.effects });
  const facts = pullFacts(mechanics, maxHp, shieldTimes);
  // A failed mechanic is taken as avoided: it takes nothing, and nothing is
  // spent on it.
  const project = (m: Mechanic, h: MechanicHit, list: PlannedUse[], of = tool) =>
    h.avoidable ? AVOIDED : projected(m, h, list, of, facts);
  const max = (h: MechanicHit) => maxHp.get(h.player) ?? Infinity;
  // The earlier mechanics of each one's burst, and whether two are in one.
  const burst = burstsOf(mechanics);
  const sameBurst = (a: Mechanic, b: Mechanic) => burst.get(a.id) === burst.get(b.id);
  const earlier = (m: Mechanic) => mechanics.filter((o) => o.at < m.at && sameBurst(o, m));
  // The HP a hit lands on (an earlier plan's, with its heals), and the most
  // it may take and leave the margin. In a burst, with no earlier plan, it
  // lands on what the burst's hits before it left: there's no time to heal.
  const hpOf = (m: Mechanic, h: MechanicHit) => {
    const known = hpAt.get(`${m.id}:${h.player}`);
    if (known !== undefined) return Math.min(max(h), known);
    let hp = max(h);
    for (const o of earlier(m)) {
      const hit = o.hits.find((x) => x.player === h.player);
      if (hit) hp -= project(o, hit, uses).damage;
    }
    return Math.max(1, hp);
  };
  const limit = (m: Mechanic, h: MechanicHit) => hpOf(m, h) - options.margin * max(h);
  const danger = (m: Mechanic) =>
    Math.max(0, ...m.hits.filter((h) => !h.avoidable).map((h) => h.unmitigated / hpOf(m, h)));
  const order = [...mechanics].sort((a, b) => danger(b) - danger(a) || a.at - b.at);
  // The longest any effect lasts: no use older than this reaches a hit.
  const longest = Math.max(0, ...tools.flatMap((t) => t.effects.map((e) => e.durationMs)));
  const add = (candidate: Candidate) => {
    for (const granted of candidate.granted ?? []) add({ ...granted, value: 0 });
    uses.push(candidate.use);
    toolOf.set(candidate.use, candidate.tool);
  };
  const plannable = tools.filter((t) => !options.replan || options.replan.includes(t.player));
  // An earlier plan's mitigations stay: taking one away would leave its hits
  // bigger, and the HP after them lower than the plan was made for. (It has
  // the fixed ones already.)
  for (const use of from?.uses ?? fixed) {
    const t = tools.find((o) => o.player === use.player && o.action === use.action);
    if (t) add({ use: { ...use, covers: [] }, tool: use.critical ? critical(t) : t, value: 0 });
  }
  // When the player can use `t` for `m`, at `at` or before it while it
  // still covers `m`; null when they can't.
  const fit = (m: Mechanic, t: MitigationTool, at: number) => {
    const from = m.at - Math.min(...t.effects.map((e) => e.durationMs));
    const occupied = uses
      .filter((u) => u.player === t.player)
      .map((u) => ({ at: u.at, gcd: tool(u).gcd, castMs: tool(u).castMs }));
    return t.gcd
      ? weaving.gcdBefore(t.player, at - t.castMs, from, t.castMs, occupied)
      : weaving.ogcdBefore(t.player, at, from, occupied);
  };
  // The invulnerabilities asked for go first, just before their mechanic,
  // as their recast allows (an earlier plan has them already).
  const unplaced = [...(from?.unplaced ?? [])];
  for (const choice of from ? [] : (options.invulnerabilities ?? [])) {
    const m = mechanics.find((o) => o.id === choice.mechanic);
    if (!m) continue;
    const t = plannable.find((o) => o.player === choice.player && o.action === choice.action);
    const at = t ? fit(m, t, m.at - LEAD_MS) : null;
    const times = uses.filter((u) => t && tool(u).group === t.group).map((u) => u.at);
    if (
      !t?.effects.some((e) => e.invulnerable) ||
      at === null ||
      at < 0 ||
      !fitsRecast(times, at, t.recastMs, t.charges)
    ) {
      unplaced.push(choice);
      continue;
    }
    add({ use: { player: t.player, action: t.action, name: t.name, at, target: null, covers: [] }, tool: t, value: 0 });
  }
  // One never to use isn't the plan's to use either.
  const never = new Set(
    (options.invulnerabilities ?? []).filter((c) => c.mechanic === null).map((c) => `${c.player}:${c.action}`),
  );

  // When a player has one action planned.
  const timesOf = (player: number, action: number) =>
    uses.filter((u) => u.player === player && u.action === action).map((u) => u.at);

  const occupiedBy = (player: number) =>
    uses.filter((u) => u.player === player).map((u) => ({ at: u.at, gcd: tool(u).gcd, castMs: tool(u).castMs }));

  // The damage `added` uses take off the hits `wanted` of `m` (and, in a
  // burst, the earlier hits on those players, which leave them the HP they
  // take it on), and a little for every other mechanic in their window, from
  // `at` for `lasts`.
  const valueOf = (
    m: Mechanic,
    added: { use: PlannedUse; tool: MitigationTool }[],
    at: number,
    lasts: number,
    wanted: (h: MechanicHit) => boolean,
  ) => {
    // Only what's up around its window can change what it adds.
    const window = mechanics.filter((o) => o.at >= at && o.at <= at + lasts);
    const near = uses.filter((u) => u.at >= at - longest && u.at <= at + lasts);
    const withIt = (u: PlannedUse) => added.find((a) => a.use === u)?.tool ?? tool(u);
    let value = 0;
    for (const other of window) {
      for (const hit of other.hits) {
        if (!added.some((a) => reaches(a.tool, a.use, other, hit).length)) continue;
        const before = project(other, hit, near).damage;
        const after = project(other, hit, [...near, ...added.map((a) => a.use)], withIt).damage;
        const counts =
          other === m
            ? wanted(hit)
            : other.at < m.at && sameBurst(other, m) && m.hits.some((x) => x.player === hit.player && wanted(x));
        value += (before - after) * (counts ? 1 : 0.25);
      }
    }
    return value;
  };

  // The uses of the action granting `t` that would let it go up at `at`,
  // landing before it, each with `t` as it would then be: on its own, and
  // made critical by Recitation where its user has it up (a bigger
  // Galvanize to spread); none when there's no tool for it.
  const granting = (m: Mechanic, t: MitigationTool, at: number): { granted: Granted[]; tool: MitigationTool }[] => {
    const grant = t.grantedBy;
    const g = grant && plannable.find((o) => o.player === t.player && o.action === grant.action);
    if (!g || !grant) return [];
    const occupied = occupiedBy(t.player);
    const lands = at - g.castMs;
    const from = Math.max(0, at - grant.withinMs);
    const gAt = g.gcd
      ? weaving.gcdBefore(t.player, lands, from, g.castMs, occupied)
      : weaving.ogcdBefore(t.player, lands - WEAVE_MS, from, occupied);
    const times = uses.filter((u) => tool(u).group === g.group).map((u) => u.at);
    if (gAt === null || gAt < 0 || isAway(g, gAt) || !fitsRecast(times, gAt, g.recastMs, g.charges)) return [];
    if (!fitsGrant(timesOf(t.player, t.action), [...timesOf(t.player, g.action), gAt], at, grant)) return [];
    const target = g.effects.some((e) => e.target === 'target') ? mostEndangered(m, uses, project, hpOf) : null;
    const use = { player: g.player, action: g.action, name: g.name, at: gAt, target, covers: [] };
    const options = [{ granted: [{ use, tool: g }], tool: t }];
    const r = g.whenCritical && t.whenCritical && plannable.find((o) => o.player === t.player && o.critical);
    if (!r) return options;
    const rAt = weaving.ogcdBefore(t.player, gAt - 1, gAt - RECITATION_MS, [
      ...occupied,
      { at: gAt, gcd: g.gcd, castMs: g.castMs },
    ]);
    const recited = uses.filter((u) => tool(u).group === r.group).map((u) => u.at);
    if (rAt === null || rAt < 0 || !fitsRecast(recited, rAt, r.recastMs, r.charges)) return options;
    const recitation = {
      use: { player: r.player, action: r.action, name: r.name, at: rAt, target: null, covers: [] },
      tool: r,
    };
    return [
      ...options,
      { granted: [recitation, { use: { ...use, critical: true }, tool: critical(g) }], tool: critical(t) },
    ];
  };

  // What one more use of `t` for `m` would add, at its best moment; null
  // when it can't be used for it. One another grants comes with a use of
  // that one where it has none, the two worth what they add together, the
  // other's GCD counted as one.
  const best = (m: Mechanic, t: MitigationTool, wanted: (h: MechanicHit) => boolean): Candidate | null => {
    const times = uses.filter((u) => tool(u).group === t.group).map((u) => u.at);
    const spent = t.pool
      ? uses.filter((u) => u.player === t.player && tool(u).pool?.name === t.pool?.name).map((u) => u.at)
      : [];
    const target = t.effects.some((e) => e.target === 'target') ? mostEndangered(m, uses, project, hpOf) : null;
    const lasts = Math.max(...t.effects.map((e) => e.durationMs));
    let found: Candidate | null = null;
    for (const moment of momentsFor(m, t, mechanics)) {
      const at = fit(m, t, moment);
      if (at === null || at < 0 || isAway(t, at) || !fitsRecast(times, at, t.recastMs, t.charges)) continue;
      if (t.pool && !fitsPool(spent, at, t.pool)) continue;
      const needs =
        t.grantedBy && !fitsGrant(timesOf(t.player, t.action), timesOf(t.player, t.grantedBy.action), at, t.grantedBy);
      for (const option of needs ? granting(m, t, at) : [{ granted: [], tool: t }]) {
        const { granted } = option;
        const crit = option.tool !== t;
        const use: PlannedUse = { player: t.player, action: t.action, name: t.name, at, target, covers: [] };
        if (crit) use.critical = true;
        const added = [{ use, tool: option.tool }, ...granted];
        const start = Math.min(at, ...granted.map((g) => g.use.at));
        let value = valueOf(m, added, start, lasts + (at - start), wanted);
        if (t.gcd) value *= GCD_WORTH;
        // A GCD that comes with it costs one, as it would on its own.
        for (const g of granted.filter((o) => o.tool.gcd)) {
          value -= (1 - GCD_WORTH) * valueOf(m, [g], start, lasts, wanted);
        }
        if (value > 0 && (!found || value > found.value)) found = { use, tool: option.tool, value, granted };
      }
    }
    return found;
  };

  // A tank's invulnerability for `m`, at the first moment it fits; null
  // when it doesn't.
  const invulnerabilityFor = (m: Mechanic, t: MitigationTool): Candidate | null => {
    const times = uses.filter((u) => tool(u).group === t.group).map((u) => u.at);
    const at = momentsFor(m, t, mechanics)
      .map((moment) => fit(m, t, moment))
      .find(
        (moment): moment is number =>
          moment !== null && moment >= 0 && fitsRecast(times, moment, t.recastMs, t.charges),
      );
    if (at === undefined) return null;
    return {
      use: { player: t.player, action: t.action, name: t.name, at, target: null, covers: [] },
      tool: t,
      value: 0,
    };
  };

  // Every hit within the margin, the most dangerous mechanics first. A
  // tank's invulnerability only where nothing else will do: the uses tried
  // for that mechanic then go back, for later ones.
  const short = (m: Mechanic) => (h: MechanicHit) => {
    const { damage, invulnerable } = project(m, h, uses);
    return !invulnerable && damage > limit(m, h);
  };
  // Recitation does nothing alone: it comes with an Adloquium (`granting`).
  const others = plannable.filter((t) => t.effects.length && !t.effects.some((e) => e.invulnerable));
  const invulnerabilities = plannable.filter(
    (t) => t.effects.some((e) => e.invulnerable) && !never.has(`${t.player}:${t.action}`),
  );
  const fill = (m: Mechanic) => {
    for (;;) {
      if (!m.hits.some(short(m))) return;
      const pick = pickBest(others.map((t) => best(m, t, short(m))));
      if (!pick) return;
      add(pick);
    }
  };
  for (const m of order) {
    const tried = uses.length;
    fill(m);
    const left = m.hits.filter(short(m));
    if (!left.length) continue;
    // Placed without the uses tried, which give their weave slots back.
    const removed = uses.splice(tried);
    const saves = left.flatMap((h) => {
      const own = invulnerabilities.filter((t) => t.player === h.player);
      return own
        .map((t) => invulnerabilityFor(m, t))
        .filter((c): c is Candidate => c !== null)
        .slice(0, 1);
    });
    if (!saves.length) {
      uses.push(...removed);
      continue;
    }
    for (const save of saves) add(save);
    fill(m);
  }
  // The oGCDs left, where they add the most margin: on the hits still
  // taking more than half of what the margin allows.
  const spare = others.filter((t) => !t.gcd);
  for (const m of order) {
    const heavy = (h: MechanicHit) => {
      const { damage, invulnerable } = project(m, h, uses);
      return !invulnerable && damage > limit(m, h) / 2;
    };
    for (let n = 0; n < SPARE_PER_MECHANIC && m.hits.some(heavy); n++) {
      const pick = pickBest(spare.map((t) => best(m, t, heavy)));
      if (!pick) break;
      add(pick);
    }
  }

  const hits = mechanics.flatMap((m) =>
    m.hits.map((hit) => {
      const { damage, absorbed, statuses, invulnerable } = project(m, hit, uses);
      const hp = maxHp.get(hit.player);
      return {
        mechanic: m.id,
        player: hit.player,
        unmitigated: hit.unmitigated,
        planned: damage,
        asPlayed: hit.asPlayed,
        absorbed,
        // At full HP: the heals come after.
        hpBefore: hp ?? null,
        share: hp ? damage / hp : null,
        safe: invulnerable || damage <= limit(m, hit),
        invulnerable,
        avoidable: hit.avoidable,
        covers: statuses,
      };
    }),
  );
  for (const use of uses) {
    use.covers = mechanics.filter((m) => m.hits.some((h) => reaches(tool(use), use, m, h).length)).map((m) => m.id);
  }
  return { mechanics, uses: [...uses].sort((a, b) => a.at - b.at || a.player - b.player), hits, unplaced, hp: [] };
}
