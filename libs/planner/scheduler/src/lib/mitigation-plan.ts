import { fitsGrant, fitsPool, fitsRecast, projected, pullFacts, reaches } from './coverage';
import { Mechanic, MechanicHit, MitigationTool, Plan, PlanOptions, PlannedUse } from './plan.model';
import { Weaving } from './weaving';

// A mitigation goes up at least this long before the hit it's for.
const LEAD_MS = 500;
// The spare pass adds at most this many uses to one mechanic.
const SPARE_PER_MECHANIC = 4;
// What a weaponskill or spell is worth next to an oGCD doing as much: it
// costs a GCD the player would deal damage with.
const GCD_WORTH = 0.4;

interface Candidate {
  use: PlannedUse;
  tool: MitigationTool;
  value: number;
}

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
// one of theirs.
export function planMitigation(
  mechanics: Mechanic[],
  tools: MitigationTool[],
  maxHp: Map<number, number>,
  options: PlanOptions,
  from?: Plan,
  fixed: PlannedUse[] = [],
  weaving = new Weaving(),
): Plan {
  const uses: PlannedUse[] = [];
  // The HP each hit lands on, by "<mechanic>:<player>".
  const hpAt = new Map<string, number>();
  for (const hit of from?.hits ?? [])
    if (hit.hpBefore !== null) hpAt.set(`${hit.mechanic}:${hit.player}`, hit.hpBefore);
  const toolOf = new Map<PlannedUse, MitigationTool>();
  const tool = (use: PlannedUse) => toolOf.get(use) as MitigationTool;
  const facts = pullFacts(mechanics, maxHp);
  const project = (m: Mechanic, h: MechanicHit, list: PlannedUse[], of = tool) => projected(m, h, list, of, facts);
  const max = (h: MechanicHit) => maxHp.get(h.player) ?? Infinity;
  // The HP a hit lands on, and the most it may take and leave the margin.
  const hpOf = (m: Mechanic, h: MechanicHit) => Math.min(max(h), hpAt.get(`${m.id}:${h.player}`) ?? Infinity);
  const limit = (m: Mechanic, h: MechanicHit) => hpOf(m, h) - options.margin * max(h);
  const danger = (m: Mechanic) => Math.max(...m.hits.map((h) => h.unmitigated / hpOf(m, h)));
  const order = [...mechanics].sort((a, b) => danger(b) - danger(a) || a.at - b.at);
  // The longest any effect lasts: no use older than this reaches a hit.
  const longest = Math.max(0, ...tools.flatMap((t) => t.effects.map((e) => e.durationMs)));
  const add = (candidate: Candidate) => {
    uses.push(candidate.use);
    toolOf.set(candidate.use, candidate.tool);
  };
  const plannable = tools.filter((t) => !options.replan || options.replan.includes(t.player));
  // An earlier plan's mitigations stay: taking one away would leave its hits
  // bigger, and the HP after them lower than the plan was made for. (It has
  // the fixed ones already.)
  for (const use of from?.uses ?? fixed) {
    const t = tools.find((o) => o.player === use.player && o.action === use.action);
    if (t) add({ use: { ...use, covers: [] }, tool: t, value: 0 });
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

  // What one more use of `t` for `m` would add, at its best moment; null
  // when it can't be used for it.
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
      if (at === null || at < 0 || !fitsRecast(times, at, t.recastMs, t.charges)) continue;
      if (t.pool && !fitsPool(spent, at, t.pool)) continue;
      if (
        t.grantedBy &&
        !fitsGrant(timesOf(t.player, t.action), timesOf(t.player, t.grantedBy.action), at, t.grantedBy)
      ) {
        continue;
      }
      const use: PlannedUse = { player: t.player, action: t.action, name: t.name, at, target, covers: [] };
      // Only what's up around its window can change what it adds.
      const window = mechanics.filter((o) => o.at >= at && o.at <= at + lasts);
      const near = uses.filter((u) => u.at >= at - longest && u.at <= at + lasts);
      const withIt = (u: PlannedUse) => (u === use ? t : tool(u));
      // The damage it takes off the hits wanted here, and a little for every
      // other mechanic its window also covers.
      let value = 0;
      for (const other of window) {
        for (const hit of other.hits) {
          if (!reaches(t, use, other, hit).length) continue;
          const before = project(other, hit, near).damage;
          const after = project(other, hit, [...near, use], withIt).damage;
          value += (before - after) * (other === m && wanted(hit) ? 1 : 0.25);
        }
      }
      if (t.gcd) value *= GCD_WORTH;
      if (value > 0 && (!found || value > found.value)) found = { use, tool: t, value };
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
  const others = plannable.filter((t) => !t.effects.some((e) => e.invulnerable));
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
        covers: statuses,
      };
    }),
  );
  for (const use of uses) {
    use.covers = mechanics.filter((m) => m.hits.some((h) => reaches(tool(use), use, m, h).length)).map((m) => m.id);
  }
  return { mechanics, uses: [...uses].sort((a, b) => a.at - b.at || a.player - b.player), hits, unplaced };
}

// When a use could go up for `m`: as late as it can, and earlier where its
// window would also catch an earlier mechanic.
function momentsFor(m: Mechanic, t: MitigationTool, mechanics: Mechanic[]) {
  const duration = Math.min(...t.effects.map((e) => e.durationMs));
  const latest = m.at - LEAD_MS;
  const earliest = Math.max(0, m.at - duration);
  const moments = new Set([latest]);
  for (const other of mechanics) {
    const at = other.at - LEAD_MS;
    if (at >= earliest && at < latest) moments.add(at);
  }
  return [...moments].filter((at) => at >= 0);
}

// The hit of `m` the plan so far leaves taking the most of the HP it lands
// on.
function mostEndangered(
  m: Mechanic,
  uses: PlannedUse[],
  project: (m: Mechanic, h: MechanicHit, list: PlannedUse[]) => { damage: number },
  hpOf: (m: Mechanic, h: MechanicHit) => number,
) {
  let worst: { player: number; share: number } | null = null;
  for (const hit of m.hits) {
    const share = project(m, hit, uses).damage / hpOf(m, hit);
    if (!worst || share > worst.share) worst = { player: hit.player, share };
  }
  return worst?.player ?? null;
}

function pickBest(candidates: (Candidate | null)[]) {
  let pick: Candidate | null = null;
  for (const c of candidates) {
    if (!c) continue;
    // The most damage taken off; on a tie, the cooldown that comes back
    // soonest, keeping the long ones for later.
    if (!pick || c.value > pick.value || (c.value === pick.value && c.tool.recastMs < pick.tool.recastMs)) pick = c;
  }
  return pick;
}
