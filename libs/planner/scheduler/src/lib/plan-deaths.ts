import type { ActionCatalog, CatalogAction, PullTimeline } from '@everise/core/api-types';
import type { Plan, PlannedDeath, PlannedUse } from './plan.model';

// The raise of each job that has one.
const RAISES: Record<string, number> = { RDM: 7523, WHM: 125, SCH: 173, AST: 3603, SGE: 24287, SMN: 173 };
const HEALERS = new Set(['WHM', 'SCH', 'AST', 'SGE']);
const SWIFTCAST = 7561;
// Measured on raised deaths in logs: a raise lands about 4 s after the death
// (the plan raises as soon as it can, a GCD's reaction after), and the raised
// player is back, at 20% of their HP, about 8 s after the raise lands.
const REACT_MS = 2_500;
const ACCEPT_MS = 8_000;
const BACK_HP = 0.2;
// Damage this close to where the HP runs out is what took it.
const SAME_MOMENT_MS = 100;
// A raidwide this soon after they're back would find them at 20%: the raise
// waits until just after it.
const GRACE_MS = 5_000;
const AFTER_HIT_MS = 500;
// A raiser's next raise: after a GCD; a Red Mage's Dualcast after one cast.
const GCD_MS = 2_500;
const DUALCAST_MS = 5_000;
const TRIES = 12;

// The plan with what it couldn't prevent: a hit that leaves a player no HP,
// which nothing in the plan saved, kills them, and so does anything else
// that takes their HP to nothing (a damage-over-time tick, an auto-attack:
// all damage counts, as in the game) (rule #1 is that nobody dies,
// so this is what's left). Dead, they take no hits and do nothing until a
// raise brings them back: by whoever loses least, as the guides rank them
// (The Balance, Icy Veins): a Red Mage, then a healer with Swiftcast, a
// Summoner with Swiftcast, a healer casting it, a Summoner casting it. As
// soon as one can (a raiser dead at the same moment first, to raise the
// rest), unless a raidwide would land as they're back; then just after it.
// With `deaths`, and the raises among its uses (`raise`).
export function withDeaths(plan: Plan, timeline: PullTimeline, catalog: ActionCatalog): Plan {
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const mechanics = new Map(plan.mechanics.map((m) => [m.id, m]));
  const deaths: PlannedDeath[] = [];
  const uses = [...plan.uses];
  const deadAt = (player: number, at: number) =>
    deaths.some((d) => d.player === player && d.at <= at && at < (d.backAt ?? Infinity));
  const lethal: { player: number; mechanic: number | null; at: number; cause?: string }[] = plan.hits
    .filter((h) => !h.safe && !h.avoidable && !h.invulnerable && h.hpBefore !== null && h.hpBefore - h.planned <= 0)
    .map((h) => ({ player: h.player, mechanic: h.mechanic, at: mechanics.get(h.mechanic)?.at ?? 0 }));
  lethal.push(...drained(plan, timeline).filter((d) => !lethal.some((l) => l.player === d.player && l.at === d.at)));
  lethal.sort((a, b) => a.at - b.at);
  const raiser = (player: number) => !!RAISES[timeline.players.find((p) => p.id === player)?.job ?? ''];
  const raises = new Raises(plan, timeline, uses, byId, deadAt);
  for (const at of [...new Set(lethal.map((l) => l.at))]) {
    const now = lethal
      .filter((l) => l.at === at && !deadAt(l.player, at))
      .sort((a, b) => Number(raiser(b.player)) - Number(raiser(a.player)));
    const fresh = now.map((l) => ({ ...l, raisedBy: null, raisedAt: null, backAt: null }) as PlannedDeath);
    deaths.push(...fresh);
    for (const death of fresh) Object.assign(death, raises.of(death));
  }
  if (!deaths.length) return plan;
  return { ...plan, deaths, ...afterDeaths(plan, timeline, deaths, raises.uses, mechanics) };
}

// Where a player's HP as the plan leaves it runs out besides a mechanic's
// hit, and what took it: the damage landing on them then, by name.
function drained(plan: Plan, timeline: PullTimeline) {
  const name = new Map(timeline.actions.map((a) => [a.id, a.name]));
  const found: { player: number; mechanic: null; at: number; cause?: string }[] = [];
  for (const curve of plan.hp) {
    for (const point of curve.points) {
      if (point.hp > 0) continue;
      const hit = timeline.damage.find((d) => d.target === curve.player && Math.abs(d.at - point.at) <= SAME_MOMENT_MS);
      found.push({ player: curve.player, mechanic: null, at: point.at, cause: hit ? name.get(hit.action) : undefined });
    }
  }
  return found;
}

// The plan's hits, HP and uses with the deaths: no hit lands on the dead
// (the fatal one marked), their HP none until they're back at 20%, and
// nothing of theirs happens while they're dead.
function afterDeaths(
  plan: Plan,
  timeline: PullTimeline,
  deaths: PlannedDeath[],
  uses: PlannedUse[],
  mechanics: Map<number, Plan['mechanics'][number]>,
) {
  const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp]));
  const dead = (player: number, at: number, mechanic?: number) =>
    deaths.some((d) => d.player === player && d.at <= at && at < (d.backAt ?? Infinity) && d.mechanic !== mechanic);
  const hits = plan.hits
    .map((h) => (deaths.some((d) => d.player === h.player && d.mechanic === h.mechanic) ? { ...h, fatal: true } : h))
    .filter((h) => !dead(h.player, mechanics.get(h.mechanic)?.at ?? 0, h.mechanic));
  const hp = plan.hp.map((curve) => {
    const own = deaths.filter((d) => d.player === curve.player);
    if (!own.length) return curve;
    const max = maxHp.get(curve.player) ?? 0;
    const points = curve.points.filter((p) => !own.some((d) => p.at >= d.at && p.at < (d.backAt ?? Infinity)));
    for (const d of own) {
      points.push({ at: d.at, hp: 0 });
      if (d.backAt !== null) points.push({ at: d.backAt, hp: BACK_HP * max });
    }
    return { ...curve, points: points.sort((a, b) => a.at - b.at) };
  });
  return {
    hits,
    hp,
    uses: uses.filter((u) => u.raise || !dead(u.player, u.at)).sort((a, b) => a.at - b.at || a.player - b.player),
  };
}

// The raises the plan gives, as it gives them: who's busy until when, and
// their Swiftcasts and a Red Mage's Dualcast.
class Raises {
  private readonly busy = new Map<number, number>();
  private readonly lastFree = new Map<number, number>();
  private readonly swiftRecast: number;

  constructor(
    private readonly plan: Plan,
    private readonly timeline: PullTimeline,
    readonly uses: PlannedUse[],
    private readonly byId: Map<number, CatalogAction>,
    private readonly deadAt: (player: number, at: number) => boolean,
  ) {
    this.swiftRecast = byId.get(SWIFTCAST)?.recastMs ?? 60_000;
  }

  // Who raises the player dead at `death.at`, when it lands and when
  // they're back; nulls where nobody can before the pull ends.
  of(death: PlannedDeath): Pick<PlannedDeath, 'raisedBy' | 'raisedAt' | 'backAt'> {
    let at = death.at + REACT_MS;
    for (let tries = 0; tries < TRIES && at < this.timeline.durationMs; tries++) {
      const by = this.options(death.player, at)[0];
      if (!by) {
        // Nobody free: when the next one is (back from a death, done casting).
        const next = this.whenFree(at);
        if (next === null) break;
        at = next;
        continue;
      }
      const landed = at + by.castMs;
      const backAt = landed + ACCEPT_MS;
      const raidwide = this.plan.mechanics.find(
        (m) => m.kind === 'raidwide' && !m.wipe && m.at > at && m.at <= backAt + GRACE_MS,
      );
      if (raidwide) {
        at = raidwide.at + AFTER_HIT_MS;
        continue;
      }
      const name = this.byId.get(by.action)?.name ?? 'Raise';
      if (by.swift) this.uses.push(use(by.player, SWIFTCAST, 'Swiftcast', at - 600, null));
      this.uses.push(use(by.player, by.action, name, at, death.player));
      this.busy.set(by.player, at + Math.max(by.castMs, GCD_MS));
      if (by.free) this.lastFree.set(by.player, at);
      return { raisedBy: by.player, raisedAt: landed, backAt };
    }
    return { raisedBy: null, raisedAt: null, backAt: null };
  }

  // Who can raise `target` at `at`, best first.
  private options(target: number, at: number) {
    return this.timeline.players
      .filter((p) => p.id !== target && p.job && RAISES[p.job] && this.byId.has(RAISES[p.job]))
      .filter((p) => this.alive(p.id, at) && (this.busy.get(p.id) ?? -Infinity) <= at)
      .map((p) => {
        const job = p.job ?? '';
        // A Red Mage's Dualcast, once a cast after the last.
        const free = job === 'RDM' && at - (this.lastFree.get(p.id) ?? -Infinity) >= DUALCAST_MS;
        const swift = !free && this.swiftFree(p.id, at);
        const instant = free || swift;
        const rank = job === 'RDM' && instant ? 0 : HEALERS.has(job) ? (swift ? 1 : 3) : swift ? 2 : 4;
        const castMs = instant ? 0 : (this.byId.get(RAISES[job])?.castMs ?? 8_000);
        return { player: p.id, action: RAISES[job], swift, free, rank, castMs };
      })
      .sort((a, b) => a.rank - b.rank);
  }

  private alive(player: number, at: number) {
    if (this.deadAt(player, at)) return false;
    const points = this.plan.hp.find((h) => h.player === player)?.points ?? [];
    const hp = [...points].reverse().find((p) => p.at <= at)?.hp;
    return hp === undefined || hp > 0;
  }

  private swiftFree(player: number, at: number) {
    const own = [
      ...this.uses.filter((u) => u.player === player),
      ...this.timeline.playerCasts.filter((c) => c.source === player),
    ];
    return !own.some((u) => u.action === SWIFTCAST && u.at <= at && at - u.at < this.swiftRecast);
  }

  // The next moment after `at` someone may be free to raise: a raiser done
  // casting, or one back from a death.
  private whenFree(at: number) {
    const later = [...this.busy.values()].filter((t) => t > at);
    for (const u of this.uses) if (u.raise && u.target !== null) later.push(u.at + ACCEPT_MS + GCD_MS);
    const next = later.filter((t) => t > at).sort((a, b) => a - b)[0];
    return next ?? null;
  }
}

const use = (player: number, action: number, name: string, at: number, target: number | null): PlannedUse => ({
  player,
  action,
  name,
  at,
  target,
  covers: [],
  raise: true,
});
