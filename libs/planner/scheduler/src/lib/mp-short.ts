import type { MpModel } from './mp';
import type { MpShort } from './mp.model';
import type { Plan } from './plan.model';

// How soon before a hit a heal turned down for MP counts against it.
const SHORT_WITHIN_MS = 15_000;

// Where the plan wanted a heal the healer hadn't the MP for: each hit left
// short soon after a heal was turned down, once per healer.
export function mpShortOf(mp: MpModel, plan: Plan): MpShort[] {
  const atOf = new Map(plan.mechanics.map((m) => [m.id, m.at]));
  const short = plan.hits.filter((h) => !h.safe).map((h) => ({ at: atOf.get(h.mechanic) ?? 0 }));
  const found = new Map<string, MpShort>();
  for (const r of mp.refused) {
    const hit = short.find((h) => h.at >= r.at && h.at - r.at <= SHORT_WITHIN_MS);
    if (hit) found.set(`${r.player}:${hit.at}`, { player: r.player, at: hit.at });
  }
  return [...found.values()].sort((a, b) => a.at - b.at);
}

// Whether the plan keeps a player alive at a moment: their HP with it then.
export function aliveIn(plan: Plan) {
  return (player: number, at: number) => {
    const points = plan.hp.find((h) => h.player === player)?.points ?? [];
    const hp = [...points].reverse().find((p) => p.at <= at)?.hp;
    return hp !== undefined && hp > 0;
  };
}
