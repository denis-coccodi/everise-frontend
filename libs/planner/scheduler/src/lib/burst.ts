import { ActionCatalog, PullTimeline, TimelinePlayer } from '@everise/core/api-types';
import { UMBRAL_DRAW } from './opener-presets';
import type { BurstAction } from './burst.model';
import type { Opening } from './openers.model';
import type { PlannedUse } from './plan.model';
import type { Occupied } from './weaving.model';
import type { Weaving } from './weaving';

const TWO_MINUTES = 120_000;
// A GCD and its weave room: a buff due in it goes in it, one due in
// downtime (no GCD of theirs) waits for their next.
const GCD_MS = 2_500;
const WEAVE_MS = 700;
export const ASTRAL_DRAW = 37017;
const THE_BALANCE = 37023;
const THE_SPEAR = 37026;

// The raid buffs and burst each job's guides use on cooldown after the
// opener, by job (Icy Veins 7.55, The Balance 7.4): Chain Stratagem,
// Divination with a Lightspeed (its other charge is for movement),
// Presence of Mind. Each delays only to the player's next weave slot.
export const BURST: Record<string, BurstAction[]> = {
  SCH: [{ action: 7436 }], // Chain Stratagem
  AST: [{ action: 16552 }, { action: 3606, everyMs: TWO_MINUTES }], // Divination, Lightspeed
  WHM: [{ action: 136 }], // Presence of Mind
};

// The actions the plan places for each job after the opener: the burst's,
// and an astrologian's draws and the cards they play.
export function burstActions(job: string): number[] {
  const own = (BURST[job] ?? []).map((b) => b.action);
  return job === 'AST' ? [...own, ASTRAL_DRAW, UMBRAL_DRAW, THE_BALANCE, THE_SPEAR] : own;
}

// The replanned players' burst after their opener, each use in the first
// weave slot from when it's due that the plan (`planned`: its heals and
// mitigations come first) and the uses before leave free; and each astrologian's draws after the opener's, as they come
// (`opening.draws`), each followed by its card: the Balance after Astral
// Draw, the Spear after Umbral Draw.
export function burstUses(
  timeline: PullTimeline,
  catalog: ActionCatalog,
  players: TimelinePlayer[],
  opening: Opening,
  weaving: Weaving,
  planned: PlannedUse[],
): PlannedUse[] {
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const end = timeline.durationMs;
  const uses: PlannedUse[] = [];
  for (const p of players) {
    const job = p.job ?? '';
    const opened = opening.uses.filter((u) => u.player === p.id);
    const taken: Occupied[] = planned
      .filter((u) => u.player === p.id)
      .map((u) => ({ at: u.at, gcd: !!byId.get(u.action)?.gcd, castMs: byId.get(u.action)?.castMs ?? 0 }));
    const firstGcd = weaving.gcdsBetween(p.id, 0, end)[0];
    if (firstGcd === undefined) continue;
    // The first weave slot from `due`, at their next GCD if it's downtime.
    const place = (action: number, name: string, due: number) => {
      const next = weaving.gcdsBetween(p.id, due - GCD_MS, end)[0];
      const at = next === undefined ? null : weaving.ogcdAfter(p.id, Math.max(due, next), end, taken);
      if (at === null) return null;
      uses.push({ player: p.id, action, name, at, target: null, covers: [], burst: true });
      taken.push({ at, gcd: false, castMs: 0 });
      return at;
    };
    for (const b of BURST[job] ?? []) {
      const action = byId.get(b.action);
      if (!action) continue;
      const every = b.everyMs ?? action.recastMs;
      const last = opened.find((u) => u.action === b.action)?.at;
      for (let due = last === undefined ? firstGcd : last + every; due < end;) {
        const at = place(b.action, action.name, due);
        if (at === null) break;
        due = at + every;
      }
    }
    const draws = opening.draws.get(p.id);
    if (!draws) continue;
    const drawn = (action: number) => opened.some((u) => u.action === action);
    const later = (times: number[], action: number) => (drawn(action) ? times.slice(1) : times).filter((t) => t > 0);
    const steps = [
      ...later(draws.astral, ASTRAL_DRAW).map((at) => ({ at, draw: ASTRAL_DRAW, card: THE_BALANCE })),
      ...later(draws.umbral, UMBRAL_DRAW).map((at) => ({ at, draw: UMBRAL_DRAW, card: THE_SPEAR })),
    ].sort((a, b) => a.at - b.at);
    for (const s of steps) {
      const at = place(s.draw, s.draw === ASTRAL_DRAW ? 'Astral Draw' : 'Umbral Draw', s.at);
      if (at !== null) place(s.card, s.card === THE_BALANCE ? 'the Balance' : 'the Spear', at + WEAVE_MS);
    }
  }
  return uses;
}
