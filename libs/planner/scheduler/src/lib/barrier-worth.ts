import { projected, reaches } from './coverage';
import type { PullFacts } from './coverage.model';
import type { HealPairing, HealTool, Mechanic, MitigationTool, PlannedUse } from './plan.model';
import type { HpEvent } from './hp-track.model';

// What a GCD heal's barrier (Succor, Eukrasian Prognosis, Adloquium) takes
// off the hits it reaches, as HP it saves when they land: with every
// mitigation and shield planned so far, so one on a player whose barrier of
// the kind is already up saves nothing. The heal step weighs a shield's
// barrier with its heal by these; they're for weighing only (`healOnly`):
// once picked, the barrier lowers the hits themselves.
const BARRIER = new WeakSet<HpEvent>();

export function barrierWorth(
  mitigationOf: Map<string, MitigationTool>,
  mechanics: Mechanic[],
  mitigating: PlannedUse[],
  toolOfUse: (use: PlannedUse) => MitigationTool,
  facts: PullFacts,
) {
  return (tool: HealTool, use: PlannedUse): HpEvent[] => {
    const shield = mitigationOf.get(`${tool.player}:${tool.action}`);
    if (!tool.gcd || !shield?.effects.some((e) => e.shield)) return [];
    const events: HpEvent[] = [];
    const toolOf = (u: PlannedUse) => (u === use ? shield : toolOfUse(u));
    for (const m of mechanics) {
      for (const h of m.hits) {
        if (!reaches(shield, use, m, h).length) continue;
        const without = projected(m, h, mitigating, toolOfUse, facts).damage;
        const saved = without - projected(m, h, [...mitigating, use], toolOf, facts).damage;
        if (saved <= 0) continue;
        // Just before the hit, where the HP it must land on is judged.
        const event = { at: m.at - 1, player: h.player, amount: saved };
        BARRIER.add(event);
        events.push(event);
      }
    }
    return events;
  };
}

// What the barriers among `events` save `player` of the hit at `at`.
export function barrierFor(events: HpEvent[], player: number, at: number) {
  return events.reduce(
    (sum, e) => (BARRIER.has(e) && e.player === player && e.at === at - 1 ? sum + e.amount : sum),
    0,
  );
}

// The events that heal, without a barrier's weighing ones.
export const healOnly = (events: HpEvent[]) => events.filter((e) => !BARRIER.has(e));

// A pairing's options for a heal weighed with its barrier: each paired on the
// heal alone, its barrier added back unless the pairing turns it into
// healing (Emergency Tactics).
export function pairedWithBarrier<T extends { pairing: HealPairing; events: HpEvent[] }>(
  events: HpEvent[],
  pair: (healing: HpEvent[]) => T[],
): T[] {
  const barrier = events.filter((e) => BARRIER.has(e));
  return pair(healOnly(events)).map((p) =>
    p.pairing.converts || !barrier.length ? p : { ...p, events: [...p.events, ...barrier] },
  );
}
