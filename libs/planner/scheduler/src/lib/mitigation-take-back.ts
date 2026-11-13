import { reaches } from './coverage';
import type { Mechanic, MechanicHit, MitigationTool, PlannedUse } from './plan.model';
import type { MpModel } from './mp';
import type { TakeBackChecks } from './mitigation-plan.model';
import { RESERVE } from './heal-refill';

// What a use taken back adds to a hit still comes off the same player's
// hits this long after: the heals can't be counted on to make it up.
const CARRY_MS = 10_000;
// A GCD whose healer goes below the MP reserve this long after it drains them.
const DRAIN_MS = 30_000;

// Takes back the GCDs (Succor, Adloquium...) after which their healer goes
// below the MP reserve (within `DRAIN_MS`) and that the uses picked after
// them left unneeded: a hit picked one when it was the most it could get,
// then the party's oGCDs went on it too, and every hit it covers keeps the
// margin without it. It drained the healer for nothing (a scholar out of MP
// while the astrologian sits full). The rest stay: the heals were planned
// around them. Each hit is judged with what the same player's hits before
// it took more without it, within `CARRY_MS`: a shield one hit didn't need
// may be what lets them survive the next. The healer lowest on MP gets
// theirs back first, the earliest first, as it frees MP for every later
// one. Only the pass's own uses go, from `first` on (an earlier round's
// stay, and the HP after them with them); a critical one stays with the
// Recitation it came with, and one another needs (an Adloquium before
// Deployment Tactics) stays for it.
export function takeBackGcds(
  uses: PlannedUse[],
  first: number,
  tool: (use: PlannedUse) => MitigationTool,
  mechanics: Mechanic[],
  checks: TakeBackChecks,
  mp?: MpModel,
): void {
  // The least MP its healer has in the `DRAIN_MS` after the use, of their max.
  const low = (use: PlannedUse) => {
    if (!mp) return 1;
    const own = uses.filter((o) => o.player === use.player);
    const share = mp.shares(use.player, own);
    const after = mp.curve(use.player, own).filter((c) => c.at >= use.at && c.at <= use.at + DRAIN_MS);
    return Math.min(share(use.at), ...after.map((c) => share(c.at)));
  };
  const needed = (use: PlannedUse) =>
    uses.some((o) => {
      const grant = o !== use && o.player === use.player ? tool(o).grantedBy : undefined;
      return grant?.action === use.action && o.at >= use.at && o.at <= use.at + grant.withinMs;
    });
  const tried = uses
    .slice(first)
    .filter((u) => tool(u).gcd && !u.critical && !needed(u))
    .map((use) => ({ use, share: low(use) }))
    .filter((x) => x.share < RESERVE)
    .sort((a, b) => a.share - b.share || a.use.at - b.use.at);
  for (const { use } of tried) {
    const t = tool(use);
    const covered = mechanics.filter((m) => m.hits.some((h) => reaches(t, use, m, h).length));
    const since = Math.min(...covered.map((m) => m.at));
    const until = Math.max(...covered.map((m) => m.at)) + CARRY_MS;
    const around = mechanics
      .filter((m) => m.at >= since && m.at <= until)
      .sort((a, b) => a.at - b.at)
      .flatMap((m) => m.hits.map((h) => ({ m, h, before: checks.hit(m, h) })));
    const index = uses.indexOf(use);
    uses.splice(index, 1);
    if (!stillSafe(around, checks)) uses.splice(index, 0, use);
  }
}

// Whether every hit safe with the use stays safe without it, each also
// taking what the same player's hits before it took more.
function stillSafe(
  around: { m: Mechanic; h: MechanicHit; before: { damage: number; invulnerable: boolean } }[],
  checks: TakeBackChecks,
): boolean {
  const more: { player: number; at: number; damage: number }[] = [];
  for (const { m, h, before } of around) {
    const after = checks.hit(m, h);
    const carried = more
      .filter((x) => x.player === h.player && m.at - x.at <= CARRY_MS)
      .reduce((sum, x) => sum + x.damage, 0);
    const wasSafe = before.invulnerable || before.damage <= checks.limit(m, h);
    if (wasSafe && !after.invulnerable && after.damage + carried > checks.limit(m, h)) return false;
    if (after.damage > before.damage) more.push({ player: h.player, at: m.at, damage: after.damage - before.damage });
  }
  return true;
}
