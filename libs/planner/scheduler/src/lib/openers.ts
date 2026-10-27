import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import { AETHERFLOW, DISSIPATION } from './aetherflow';
import { ENERGY_DRAIN, OPENERS, UMBRAL_DRAW } from './opener-presets';
import type { OpenerId } from './openers.model';
import type { PlannedUse } from './plan.model';

export { OPENERS } from './opener-presets';

// How long after a GCD begins an oGCD can follow it: its cast, or an
// instant one's lock; a second one after the same GCD a weave later.
const WEAVE_AFTER_MS = 700;
const AETHERFLOW_MS = 60_000;
// After the opener, Dissipation stays where the player used it: the guides
// hold it for when the healing needs it.
const OPENER_MS = 45_000;
// Astral and Umbral Draw take turns, one every 55 seconds.
const DRAW_MS = 55_000;

// A player's opener as uses, at their GCDs as played (counted from the one
// begun in the countdown; a GCD every 2.5s without any), each marked as
// the opener's.
export function openerUses(
  timeline: PullTimeline,
  catalog: ActionCatalog,
  player: number,
  job: string,
  opener: OpenerId,
): PlannedUse[] {
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const gcds = timeline.playerCasts
    .filter((c) => c.source === player && byId.get(c.action)?.gcd)
    .sort((a, b) => a.at - b.at);
  const startOf = (n: number) => gcds[n]?.at ?? n * 2500;
  const after = (n: number) => {
    const g = gcds[n];
    return g ? g.at + Math.max(g.castMs ?? 0, WEAVE_AFTER_MS) : n * 2500 + WEAVE_AFTER_MS;
  };
  const steps = OPENERS[job]?.find((p) => p.id === opener)?.steps ?? [];
  const woven = new Map<number, number>();
  return steps.map((s) => {
    let at = s.at ?? 0;
    if (s.gcd !== undefined) at = startOf(s.gcd);
    if (s.afterGcd !== undefined) {
      const before = woven.get(s.afterGcd) ?? 0;
      woven.set(s.afterGcd, before + 1);
      at = after(s.afterGcd) + before * WEAVE_AFTER_MS;
    }
    return {
      player,
      action: s.action,
      name: s.name ?? byId.get(s.action)?.name ?? '',
      at,
      target: null,
      covers: [],
      opener: true,
    };
  });
}

// A scholar's stacks with their opener's uses: when each Aetherflow and
// Dissipation lands (Aetherflow on cooldown after the opener's; from the
// first GCD with none), Dissipation after the opener as played.
export function scholarTimes(
  timeline: PullTimeline,
  scholar: number,
  uses: PlannedUse[],
  firstGcd: number,
): { aetherflow: number[]; dissipation: number[] } {
  const played = timeline.playerCasts.filter((c) => c.source === scholar && c.action === DISSIPATION).map((c) => c.at);
  const firstOf = (action: number) => uses.find((u) => u.action === action)?.at;
  const aetherflow: number[] = [];
  for (let at = firstOf(AETHERFLOW) ?? firstGcd; at <= timeline.durationMs; at += AETHERFLOW_MS) aetherflow.push(at);
  const opened = firstOf(DISSIPATION);
  const dissipation = opened === undefined ? played : [opened, ...played.filter((at) => at > OPENER_MS)];
  return { aetherflow, dissipation };
}

// An astrologian's draws with their opener: Astral Draw in the countdown
// (its cards at the pull), Umbral Draw where the opener has it, then each
// in turn 55 seconds apart.
export function astrologianDraws(uses: PlannedUse[], durationMs: number): { astral: number[]; umbral: number[] } {
  const umbralAt = uses.find((u) => u.action === UMBRAL_DRAW)?.at ?? WEAVE_AFTER_MS;
  const astral = [0];
  const umbral: number[] = [];
  for (let at = umbralAt, i = 0; at <= durationMs; at += DRAW_MS, i++) (i % 2 ? astral : umbral).push(at);
  return { astral, umbral };
}

// An opener's steps with only the Energy Drains its heals leave stacks for:
// in the window from each refill to the next, the heals' stacks (`spent`)
// come first, the latest Energy Drains dropped for them, as the guides say
// (hold a stack for healing when it's needed).
export function withStacksLeft(uses: PlannedUse[], refills: number[], spent: number[]): PlannedUse[] {
  const sorted = [...refills].sort((a, b) => a - b);
  const windowOf = (at: number) => sorted.filter((r) => r <= at).length - 1;
  const left = sorted.map((_, i) => 3 - spent.filter((at) => windowOf(at) === i).length);
  return uses.filter((u) => {
    if (u.action !== ENERGY_DRAIN) return true;
    const i = windowOf(u.at);
    if (i < 0 || left[i] <= 0) return false;
    left[i]--;
    return true;
  });
}
