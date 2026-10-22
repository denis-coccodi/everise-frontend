import { fitsGrant, fitsPool, fitsRecast, projected, pullFacts, reaches } from './coverage';
import { Mechanic, MechanicHit, MitigationTool, Plan, PlanOptions, PlannedUse } from './plan.model';

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
// earlier plan, on top of its mitigations, at the HP its heals left.
export function planMitigation(
  mechanics: Mechanic[],
  tools: MitigationTool[],
  maxHp: Map<number, number>,
  options: PlanOptions,
  from?: Plan,
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
  // An earlier plan's mitigations stay: taking one away would leave its hits
  // bigger, and the HP after them lower than the plan was made for.
  for (const use of from?.uses ?? []) {
    const t = tools.find((o) => o.player === use.player && o.action === use.action);
    if (t) add({ use: { ...use, covers: [] }, tool: t, value: 0 });
  }

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
    for (const at of momentsFor(m, t, mechanics)) {
      if (!fitsRecast(times, at, t.recastMs, t.charges)) continue;
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

  // Every hit within the margin, the most dangerous mechanics first.
  for (const m of order) {
    for (;;) {
      const short = (h: MechanicHit) => project(m, h, uses).damage > limit(m, h);
      if (!m.hits.some(short)) break;
      const pick = pickBest(tools.map((t) => best(m, t, short)));
      if (!pick) break;
      add(pick);
    }
  }
  // The oGCDs left, where they add the most margin: on the hits still
  // taking more than half of what the margin allows.
  const spare = tools.filter((t) => !t.gcd);
  for (const m of order) {
    const heavy = (h: MechanicHit) => project(m, h, uses).damage > limit(m, h) / 2;
    for (let n = 0; n < SPARE_PER_MECHANIC && m.hits.some(heavy); n++) {
      const pick = pickBest(spare.map((t) => best(m, t, heavy)));
      if (!pick) break;
      add(pick);
    }
  }

  const hits = mechanics.flatMap((m) =>
    m.hits.map((hit) => {
      const { damage, absorbed, statuses } = project(m, hit, uses);
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
        safe: damage <= limit(m, hit),
        covers: statuses,
      };
    }),
  );
  for (const use of uses) {
    use.covers = mechanics.filter((m) => m.hits.some((h) => reaches(tool(use), use, m, h).length)).map((m) => m.id);
  }
  return { mechanics, uses: [...uses].sort((a, b) => a.at - b.at || a.player - b.player), hits };
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
