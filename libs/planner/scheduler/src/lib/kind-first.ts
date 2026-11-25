import type { Candidate } from './mitigation-plan.model';
import { pickBest } from './mitigation-moments';
import { fitsRecast, isAway } from './coverage';
import type { Spent } from './heal-plan.model';
import type { HpEvent } from './hp-track.model';
import type { HealTool, Mechanic, MechanicHit, MitigationTool, PlannedUse } from './plan.model';
import type { Weaving } from './weaving';

// The skills meant for one kind of mechanic, as The Balance's guides use them and the logs' healers press them
// (bench, Ultimate and Savage: what follows each cast; "3+" is three raidwides or more in its effect):
// - several raidwides in a row (`MULTI_HIT`): Liturgy of the Bell ("most effective at healing multiple raidwides";
//   3+ after 63% of the logs' casts), Panhaima (54%), Seraphism (46%), Sun Sign (47%), Divine Caress (44%), Expedient
//   (40%), Temperance ("heavy raidwides", 38%); an everyday Kerachole or Sacred Soil has 3+ after 21-23%, any second
//   of uptime 12%;
// - tank busters (`BUSTER`, a buster within 10s): Aquaveil (77%), Exaltation (68%, two or more 45%), Haima (48%, two
//   or more 31%: its five barriers, one a hit), Taurochole (42%: "the heal will heal off the raidwide, while the
//   mitigation will work nicely for the tankbuster"), the Bole ("additional support in tank busters"); any second
//   21%.
// The plan, placing them by what they take off wherever they fit first, had Liturgy before 3+ raidwides 19% of the
// time, Haima 35% and Exaltation 32%.
export const MULTI_HIT = new Set([25862, 24311, 37014, 37031, 37011, 25868, 16536]);
export const BUSTER = new Set([25861, 25873, 24305, 24303, 37027]);
// A tank buster this big (unmitigated, a share of max HP), still short of the margin with the tank's own cooldowns
// (`tank-busters.ts`), gets one of them first: on every heavy buster, the plan had 2-3 times the logs' Aquaveils, Exaltations
// and Taurocholes.
const HEAVY = 0.6;
// Taurochole: a buster this soon after a raidwide (its heal for the raidwide, its mitigation for the buster). On every
// heavy buster still short, the plan had half as many again as the logs.
const TAUROCHOLE = 24303;
const AFTER_RAIDWIDE_MS = 10_000;
// Busters this close together come first for a buster skill (Haima's 15s, Exaltation's 8s).
const TOGETHER_MS = 15_000;
// Raidwides in a skill's effect that make a stretch of several.
const SEVERAL = 3;
// How long a heal meant for a stretch lasts (Liturgy's stacks, Seraphism), and a multi-hit skill with no duration of its own.
const STRETCH_MS = 20_000;

const raidwide = (m: Mechanic) => m.kind === 'raidwide';

// The raidwides from `m` on, within `withinMs`.
function stretchFrom(m: Mechanic, mechanics: Mechanic[], withinMs: number) {
  return mechanics.filter((o) => raidwide(o) && o.at >= m.at && o.at <= m.at + withinMs);
}

// How long a tool's effect lasts: what a stretch for it can span.
const lastsOf = (t: { effects: { durationMs: number }[] }) =>
  Math.max(0, ...t.effects.map((e) => e.durationMs)) || STRETCH_MS;

// Each skill meant for one kind of mechanic (`MULTI_HIT`, `BUSTER`) placed on those first, over the whole fight,
// before anything else but the tank busters' own cooldowns: a multi-hit skill on the first raidwide of each stretch of
// several in its effect, the most dangerous first (`order`), as `best` places it there; then each heavy tank buster
// still short of the margin (`HEAVY`) one of the buster skills, the one that takes the most off its tank (on every
// such buster each that fit, the plan had 1.5-2 times the logs' Aquaveils, Exaltations and Taurocholes), the busters
// with another in a buster skill's effect first (Haima's barriers, one a hit; Exaltation's), then the most dangerous.
// Afterwards they're free for any mechanic their recast allows.
export function kindFirst(
  order: Mechanic[],
  tools: MitigationTool[],
  mechanics: Mechanic[],
  best: (m: Mechanic, t: MitigationTool, wanted: (h: MechanicHit) => boolean) => Candidate | null,
  add: (c: Candidate) => void,
  maxHp: Map<number, number>,
  short: (m: Mechanic) => (h: MechanicHit) => boolean,
) {
  for (const t of tools.filter((o) => MULTI_HIT.has(o.action))) {
    const lasts = lastsOf(t);
    for (const m of order.filter((o) => raidwide(o) && stretchFrom(o, mechanics, lasts).length >= SEVERAL)) {
      const pick = best(m, t, (h) => !h.avoidable);
      if (pick) add(pick);
    }
  }
  const busterTools = tools.filter((o) => BUSTER.has(o.action));
  const heavy = (h: MechanicHit) => !h.avoidable && h.unmitigated >= HEAVY * (maxHp.get(h.player) ?? Infinity);
  const shortOn = (m: Mechanic) => (h: MechanicHit) => heavy(h) && short(m)(h);
  const together = (m: Mechanic) =>
    mechanics.filter((o) => o.kind === 'tankbuster' && o.at >= m.at && o.at <= m.at + TOGETHER_MS).length;
  const afterRaidwide = (m: Mechanic) =>
    mechanics.some((o) => raidwide(o) && o.at < m.at && o.at >= m.at - AFTER_RAIDWIDE_MS);
  const busters = order.filter((m) => m.kind === 'tankbuster' && m.hits.some(shortOn(m)));
  for (const m of [...busters].sort((a, b) => together(b) - together(a))) {
    const fits = busterTools.filter((t) => t.action !== TAUROCHOLE || afterRaidwide(m));
    const pick = pickBest(fits.map((t) => best(m, t, shortOn(m))));
    if (pick) add(pick);
  }
}

// How long before a stretch's first raidwide a heal meant for it goes in at the latest, and how early at most.
const LEAD_MS = 1_000;
const WINDOW_MS = 8_000;

// The heals meant for stretches of several raidwides (Liturgy of the Bell, Seraphism: `MULTI_HIT`) placed before
// anything else is: over the whole fight, the heaviest stretch first (its raidwides' damage), each just before the
// stretch's first raidwide, in a free weave slot, wherever their recast allows. Left to the heal pass, Liturgy went in
// before the mechanic ahead of the hit that needed it, its 20s mostly gone by the stretch. `spent` takes the uses.
export function stretchHeals(
  tools: HealTool[],
  spent: Spent[],
  weaving: Weaving,
  eventsFor: (tool: HealTool, use: PlannedUse, delayMs: number) => HpEvent[],
  mechanics: Mechanic[],
): { uses: PlannedUse[]; events: HpEvent[] } {
  const uses: PlannedUse[] = [];
  const events: HpEvent[] = [];
  const live = mechanics.filter((m) => !m.wipe && m.hits.some((h) => !h.avoidable));
  const weight = (stretch: Mechanic[]) =>
    stretch.reduce((sum, m) => sum + m.hits.reduce((s, h) => s + (h.avoidable ? 0 : h.unmitigated), 0), 0);
  for (const tool of tools.filter((t) => MULTI_HIT.has(t.action))) {
    const stretches = live
      .filter((m) => raidwide(m))
      .map((m) => stretchFrom(m, live, STRETCH_MS))
      .filter((stretch) => stretch.length >= SEVERAL)
      .sort((a, b) => weight(b) - weight(a));
    for (const [first] of stretches) {
      const own = spent.filter((x) => x.player === tool.player);
      const latest = first.at - LEAD_MS - tool.castMs;
      const at = tool.gcd
        ? weaving.gcdBefore(tool.player, latest, latest - WINDOW_MS, tool.castMs, own)
        : weaving.ogcdBefore(tool.player, latest, latest - WINDOW_MS, own);
      const times = spent.filter((x) => x.group === tool.group).map((x) => x.at);
      if (at === null || at < 0 || isAway(tool, at) || !fitsRecast(times, at, tool.recastMs, tool.charges)) continue;
      const use: PlannedUse = {
        player: tool.player,
        action: tool.action,
        name: tool.name,
        at,
        target: null,
        covers: [],
      };
      uses.push(use);
      events.push(...eventsFor(tool, use, 0));
      const { player, action, group, pool, gcd, castMs } = tool;
      spent.push({ player, action, at, group, pool, gcd, castMs });
    }
  }
  return { uses, events };
}
