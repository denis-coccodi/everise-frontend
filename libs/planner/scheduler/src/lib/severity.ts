import type { PullTimeline } from '@everise/core/api-types';
import { mechanicsOf } from './mechanics';
import type { Mechanic } from './plan.model';
import type { Severity, SeverityTier } from './severity.model';

const TIERS: SeverityTier[] = ['light', 'moderate', 'heavy', 'lethal', 'overkill'];
// Where each tier starts, as a share of max HP before any mitigation: for
// the party (30%, 60%, 90%: lethal unmitigated, 120%), and for a tank
// buster, measured on tank HP before the tanks' own mitigation (set from
// real Savage and Ultimate pulls, where half of them are over 130%).
const PARTY = [0.3, 0.6, 0.9, 1.2];
const TANK = [0.75, 1.25, 1.75, 2.5];
// A hit this long after its attack's first is the same attack.
const SAME_ATTACK_MS = 1000;

// How hard a mechanic hits: the median of its hits (a failed one left out)
// against each player's max HP, so an attack on the whole party isn't
// counted eight times over; null when the log has no max HP for them.
export function severityOf(m: Mechanic, maxHp: Map<number, number | null>): Severity | null {
  const shares = m.hits
    .filter((h) => !h.failed && maxHp.get(h.player))
    .map((h) => h.unmitigated / (maxHp.get(h.player) as number))
    .sort((a, b) => a - b);
  if (!shares.length) return null;
  const share = shares[Math.floor(shares.length / 2)];
  const from = m.kind === 'tankbuster' ? TANK : PARTY;
  return { tier: TIERS[from.filter((start) => share >= start).length], kind: m.kind, share };
}

// Each boss attack's severity in the pull, by the attack and when it hit;
// null for a hit that's no mechanic (an auto-attack, a damage over time).
export function attackSeverity(timeline: PullTimeline): (action: number, at: number) => Severity | null {
  const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp]));
  const attacks = mechanicsOf(timeline).map((m) => ({ m, severity: severityOf(m, maxHp) }));
  return (action, at) =>
    attacks.find(({ m }) => m.action === action && at >= m.at && at - m.at <= SAME_ATTACK_MS)?.severity ?? null;
}
