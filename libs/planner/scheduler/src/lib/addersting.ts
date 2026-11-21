import type { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import type { StingCast } from './addersting.model';

// A sage's Addersting, as the trait has it: one stack when the barrier of their Eukrasian Diagnosis (on anyone) or of
// their Eukrasian Prognosis (on themselves) is completely absorbed, up to 3; each Toxikon spends one. A barrier is
// absorbed once its holder has taken its size (the sage's heal power, `power`, times the heal's potency and the
// barrier's share of it) in its 30s, counted as played (as a Blackest Night's break: `blackestNightBreaks`).
const DIAGNOSIS = [24291];
const PROGNOSIS = [24292, 37034];
export const TOXIKONS = new Set([24304, 24316]);
const MAX_STINGS = 3;

// When each of the sage's barriers among `casts` breaks, giving a stack.
export function stingsFrom(
  timeline: PullTimeline,
  catalog: ActionCatalog,
  sage: number,
  power: number,
  casts: StingCast[],
): number[] {
  const taken = new Map<number, { at: number; amount: number; absorbed: number }[]>();
  for (const hit of timeline.damage) taken.set(hit.target, [...(taken.get(hit.target) ?? []), hit]);
  for (const list of taken.values()) list.sort((a, b) => a.at - b.at);
  const stings: number[] = [];
  for (const c of casts) {
    const holder = DIAGNOSIS.includes(c.action) ? (c.target ?? sage) : PROGNOSIS.includes(c.action) ? sage : null;
    if (holder === null) continue;
    const action = catalog.actions.find((a) => a.id === c.action);
    const heal = action?.effects.find((e) => e.kind === 'heal')?.potency ?? 0;
    const shield = action?.effects.find((e) => e.kind === 'shield' && !e.condition);
    const size = power * heal * ((shield?.percent ?? 0) / 100);
    if (!size) continue;
    let sum = 0;
    for (const hit of taken.get(holder) ?? []) {
      if (hit.at <= c.at) continue;
      if (hit.at > c.at + (shield?.durationMs ?? 0)) break;
      sum += hit.amount + hit.absorbed;
      if (sum >= size) {
        stings.push(hit.at);
        break;
      }
    }
  }
  return stings.sort((a, b) => a - b);
}

// Of the sage's Toxikons (theirs, not `own`), those the stacks don't pay for, from `start` at the pull: each kept only
// where every one kept before it still has its stack.
export function unpaidToxikons(toxikons: StingCast[], stings: number[], start: number): Set<StingCast> {
  const unpaid = new Set<StingCast>();
  const events = [
    ...stings.map((at) => ({ at, gain: true as const })),
    ...toxikons.map((t) => ({ at: t.at, gain: false as const, t })),
  ].sort((a, b) => a.at - b.at || Number(b.gain) - Number(a.gain));
  let level = start;
  for (const e of events) {
    if (e.gain) level = Math.min(MAX_STINGS, level + 1);
    else if (level >= 1) level--;
    else unpaid.add(e.t);
  }
  return unpaid;
}

// What the sage had at the pull for their Toxikons as played to be paid.
export function stingsAtPull(toxikons: StingCast[], stings: number[]): number {
  for (let start = 0; start < MAX_STINGS; start++) if (!unpaidToxikons(toxikons, stings, start).size) return start;
  return MAX_STINGS;
}
