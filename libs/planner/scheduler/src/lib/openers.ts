import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import { AETHERFLOW, DISSIPATION } from './aetherflow';
import type { OpenerId, OpenerPreset } from './openers.model';
import type { PlannedUse } from './plan.model';

// The openers a replanned player can start the pull with, as the job's
// guides give them, by job: each a step after one of their GCDs (counted
// from 0, the spell begun in the countdown), woven after it. "none" has no
// opener: the plan places what it needs.

const CHAIN_STRATAGEM = 7436;
const ENERGY_DRAIN = 167;
const BANEFUL_IMPACTION = 37012;
const SCHOLAR_SOURCE = 'Icy Veins (7.55), The Balance (7.4)';

// Precast Broil IV, Biolysis, then the first stacks, Chain Stratagem on
// the second GCD, three Energy Drains, the other stacks, Baneful Impaction
// and three more Energy Drains.
const scholarOpener = (first: number, second: number) => [
  { action: first, afterGcd: 1 },
  { action: CHAIN_STRATAGEM, afterGcd: 2 },
  { action: ENERGY_DRAIN, afterGcd: 3 },
  { action: ENERGY_DRAIN, afterGcd: 4 },
  { action: ENERGY_DRAIN, afterGcd: 5 },
  { action: second, afterGcd: 6 },
  { action: BANEFUL_IMPACTION, afterGcd: 7 },
  { action: ENERGY_DRAIN, afterGcd: 8 },
  { action: ENERGY_DRAIN, afterGcd: 9 },
  { action: ENERGY_DRAIN, afterGcd: 10 },
];

export const OPENERS: Record<string, OpenerPreset[]> = {
  SCH: [
    {
      id: 'standard',
      name: 'Standard: Aetherflow first',
      source: SCHOLAR_SOURCE,
      steps: scholarOpener(AETHERFLOW, DISSIPATION),
    },
    {
      id: 'dissipation-first',
      name: 'Dissipation first',
      source: SCHOLAR_SOURCE,
      steps: scholarOpener(DISSIPATION, AETHERFLOW),
    },
    { id: 'none', name: 'None: planned without an opener', source: '', steps: [] },
  ],
};

// How long after a GCD begins an oGCD can follow it: its cast, or an
// instant one's lock.
const WEAVE_AFTER_MS = 700;
const AETHERFLOW_MS = 60_000;
// After the opener, Dissipation stays where the player used it: the guides
// hold it for when the healing needs it.
const OPENER_MS = 45_000;

// A scholar's stacks with an opener: when each Aetherflow and Dissipation
// lands (Aetherflow on cooldown after the opener's), and the opener's own
// uses, for the plan to show. With "none", Aetherflow on cooldown from the
// first GCD; Dissipation as played.
export function scholarTimes(
  timeline: PullTimeline,
  catalog: ActionCatalog,
  scholar: number,
  opener: OpenerId,
): { aetherflow: number[]; dissipation: number[]; uses: PlannedUse[] } {
  const gcd = new Map(catalog.actions.map((a) => [a.id, a]));
  const casts = timeline.playerCasts.filter((c) => c.source === scholar).sort((a, b) => a.at - b.at);
  const gcds = casts.filter((c) => gcd.get(c.action)?.gcd);
  const after = (n: number) => {
    const g = gcds[n];
    return g ? g.at + Math.max(g.castMs ?? 0, WEAVE_AFTER_MS) : n * 2500;
  };
  const played = (action: number) => casts.filter((c) => c.action === action).map((c) => c.at);
  const steps = OPENERS['SCH'].find((p) => p.id === opener)?.steps ?? [];
  const uses: PlannedUse[] = steps.map((s) => ({
    player: scholar,
    action: s.action,
    name: gcd.get(s.action)?.name ?? '',
    at: after(s.afterGcd),
    target: null,
    covers: [],
    opener: true,
  }));
  const firstOf = (action: number) => uses.find((u) => u.action === action)?.at;
  const start = firstOf(AETHERFLOW) ?? after(1);
  const aetherflow: number[] = [];
  for (let at = start; at <= timeline.durationMs; at += AETHERFLOW_MS) aetherflow.push(at);
  const opened = firstOf(DISSIPATION);
  const dissipation =
    opened === undefined ? played(DISSIPATION) : [opened, ...played(DISSIPATION).filter((at) => at > OPENER_MS)];
  return { aetherflow, dissipation, uses };
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
