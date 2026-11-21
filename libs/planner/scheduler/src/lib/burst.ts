import { ActionCatalog, PullTimeline, TimelinePlayer } from '@everise/core/api-types';
import { fitsRecast } from './coverage';
import { UMBRAL_DRAW } from './opener-presets';
import type { BurstAction } from './burst.model';
import { burstWindows, windowDue } from './burst-windows';
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
const LIGHTSPEED = 3606;
const LIGHTSPEED_MS = 15_000;
// A Lightspeed of the player's this far from the plan's is their second charge.
const SECOND_CHARGE_MS = 20_000;
// How often a planned second charge is looked for.
const STEP_MS = 5_000;
const THE_BALANCE = 37023;
const THE_SPEAR = 37026;
const LORD_OF_CROWNS = 7444;
const DIVINATION = 16552;
// How often an astrologian can draw, where the catalog doesn't say.
const DRAW_MS = 55_000;

// The raid buffs and burst each job's guides use on cooldown after the
// opener, by job (Icy Veins 7.55, The Balance 7.4): Chain Stratagem,
// Divination with a Lightspeed (its other charge is for movement),
// Presence of Mind; Fight or Flight; Inner Release, and Infuriate twice a
// minute (always recharging: each Fell Cleave and Inner Chaos takes 5s off);
// Delirium; No Mercy and Bloodfest (60s since 7.4), lined up with the party's burst windows as played (`windowDue`).
// Each delays only to the player's next weave slot. All go before the heals and mitigations (`early`), as players keep
// their burst in its window and heal around it (placed after, a scholar's Chain Stratagem slid 20s and more past its
// window, then missed the next); an astrologian's cards go by Divination.
export const BURST: Record<string, BurstAction[]> = {
  SCH: [{ action: 7436, early: true }], // Chain Stratagem
  AST: [
    { action: LIGHTSPEED, everyMs: TWO_MINUTES, early: true },
    { action: DIVINATION, early: true },
  ],
  WHM: [{ action: 136, early: true }], // Presence of Mind
  PLD: [{ action: 20, early: true }], // Fight or Flight
  WAR: [
    { action: 7389, early: true }, // Inner Release
    { action: 52, everyMs: 30_000, early: true }, // Infuriate
  ],
  DRK: [{ action: 7390, early: true }], // Delirium
  GNB: [
    { action: 16138, early: true }, // No Mercy
    { action: 16164, early: true }, // Bloodfest
  ],
};

// The actions the plan places for each job after the opener: the burst's,
// and an astrologian's draws and the cards they play.
export function burstActions(job: string): number[] {
  const own = (BURST[job] ?? []).map((b) => b.action);
  return job === 'AST' ? [...own, ASTRAL_DRAW, UMBRAL_DRAW, THE_BALANCE, THE_SPEAR, LORD_OF_CROWNS] : own;
}

// The replanned players' burst after their opener, each use in the first
// weave slot from when it's due that the plan (`planned`: its heals and
// mitigations come first, but for the `early` ones) and the uses before
// leave free; and each astrologian's draws and damage cards (`cardCycle`), early.
export function burstUses(
  timeline: PullTimeline,
  catalog: ActionCatalog,
  players: TimelinePlayer[],
  opening: Opening,
  weaving: Weaving,
  planned: PlannedUse[],
  early = false,
): PlannedUse[] {
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const end = timeline.durationMs;
  const uses: PlannedUse[] = [];
  const windows = burstWindows(timeline);
  for (const p of players) {
    const job = p.job ?? '';
    const opened = opening.uses.filter((u) => u.player === p.id);
    const taken: Occupied[] = planned
      .filter((u) => u.player === p.id && u.again !== 'ends')
      .map((u) => ({ at: u.at, gcd: !!byId.get(u.action)?.gcd, castMs: byId.get(u.action)?.castMs ?? 0 }));
    const firstGcd = weaving.gcdsBetween(p.id, 0, end)[0];
    if (firstGcd === undefined) continue;
    // The first weave slot from `due`, at their next GCD if it's downtime
    // (past a completed wipe's wipe point, those at their rhythm); with none
    // left, from `due` itself.
    const place = (action: number, name: string, due: number) => {
      const next = weaving.gcdsBetween(p.id, due - GCD_MS, end)[0] ?? (weaving.freeAt(p.id, due) ? due : undefined);
      const at = next === undefined ? null : weaving.ogcdAfter(p.id, Math.max(due, next), end, taken);
      if (at === null) return null;
      uses.push({ player: p.id, action, name, at, target: null, covers: [], burst: true });
      taken.push({ at, gcd: false, castMs: 0 });
      return at;
    };
    for (const b of (BURST[job] ?? []).filter((x) => !!x.early === early)) {
      const action = byId.get(b.action);
      if (!action) continue;
      const every = b.everyMs ?? action.recastMs;
      const last = opened.filter((u) => u.action === b.action).at(-1)?.at;
      // Back from its recast, in the party's next burst window as played (`windowDue`).
      const after = (back: number) => windowDue(back, every, windows);
      for (let due = last === undefined ? firstGcd : after(last + every); due < end;) {
        const at = place(b.action, action.name, due);
        if (at === null) break;
        due = after(at + every);
      }
    }
    const draws = opening.draws.get(p.id);
    if (!early || !draws) continue;
    const divinations = [...opened, ...uses]
      .filter((u) => u.action === DIVINATION)
      .map((u) => u.at)
      .sort((a, b) => a - b);
    cardCycle(place, divinations, draws.umbral[0], byId.get(ASTRAL_DRAW)?.recastMs ?? DRAW_MS);
  }
  return uses;
}

// An astrologian's draws and damage cards after the opener's, as The Balance (7.3, 7.4) and the logs' astrologians
// play them (the Balance 83%, the Spear 90% in a Divination window): Astral Draw once its recast is back (the odd
// minute), its Balance and Lord of Crowns held to the next Divination ("Do NOT use these immediately! Hold these
// actions for another minute until Divination is back!"), then Umbral Draw and its Spear in that window. So Lord of
// Crowns always goes before the Umbral Draw that would swap it for the Lady. From the opener's Umbral Draw (`from`).
function cardCycle(
  place: (action: number, name: string, due: number) => number | null,
  divinations: number[],
  from: number,
  recastMs: number,
) {
  for (let last = from; ;) {
    const astral = place(ASTRAL_DRAW, 'Astral Draw', last + recastMs);
    if (astral === null) return;
    const divination = divinations.find((d) => d >= astral);
    const balance = place(THE_BALANCE, 'the Balance', Math.max(divination ?? 0, astral + WEAVE_MS));
    const lord = balance === null ? null : place(LORD_OF_CROWNS, 'Lord of Crowns', balance + WEAVE_MS);
    const after = (lord ?? balance ?? astral) + WEAVE_MS;
    const umbral = place(UMBRAL_DRAW, 'Umbral Draw', Math.max(astral + recastMs, after));
    if (umbral === null) return;
    place(THE_SPEAR, 'the Spear', umbral + WEAVE_MS);
    last = umbral;
  }
}

// Each astrologian's draws from when the plan placed them (`uses`, the early `burstUses`), not when they were due, so
// their cards come and go with them; the countdown's Astral Draw and the opener's Umbral Draw as they were. Changed
// in place: the cards' pools hold these lists (`withDraws`).
export function redrawn(opening: Opening, uses: PlannedUse[]) {
  for (const [player, draws] of opening.draws) {
    const at = (action: number) => uses.filter((u) => u.player === player && u.action === action).map((u) => u.at);
    const redraw = (list: number[], action: number) =>
      list.splice(0, list.length, ...[...list.slice(0, 1), ...at(action)].sort((a, b) => a - b));
    redraw(draws.astral, ASTRAL_DRAW);
    redraw(draws.umbral, UMBRAL_DRAW);
  }
}

// A replanned astrologian's Lightspeeds, placed before the heals and
// mitigations since they make weave room: the opener's, then one each two
// minutes; their slots kept, and the spells in their 15s shorter
// (`Weaving.lightspeed`). Their draws too, so the cards the heals play come
// and go with them (`redrawn`): an Umbral Draw swaps the Arrow, the Spire
// and Lord of Crowns for the Bole, the Ewer and Lady of Crowns, Astral Draw back.
export function placeLightspeed(
  timeline: PullTimeline,
  catalog: ActionCatalog,
  players: TimelinePlayer[],
  opening: Opening,
  weaving: Weaving,
  // Each astrologian's other charge: as played (left out), or planned.
  second: Record<number, 'logged' | 'replan'> = {},
): PlannedUse[] {
  const replanSecond = (player: number) => second[player] === 'replan';
  const uses = burstUses(timeline, catalog, players, opening, weaving, opening.uses, true);
  redrawn(opening, uses);
  for (const p of players.filter((o) => o.job === 'AST' && replanSecond(o.id))) {
    uses.push(...secondCharges(p.id, timeline.durationMs, catalog, weaving, [...opening.uses, ...uses]));
  }
  weaving.keep(uses.map((u) => ({ player: u.player, at: u.at, gcd: false, castMs: 0 })));
  for (const p of players.filter((o) => o.job === 'AST')) {
    const planned = [...opening.uses, ...uses].filter((u) => u.player === p.id && u.action === LIGHTSPEED);
    // Their other charge, for movement: each of theirs far from the plan's
    // stays as played (and shows so in the plan's log).
    const own = replanSecond(p.id)
      ? []
      : timeline.playerCasts.filter(
          (c) =>
            c.source === p.id &&
            c.action === LIGHTSPEED &&
            planned.every((u) => Math.abs(u.at - c.at) >= SECOND_CHARGE_MS),
        );
    weaving.keep(own.map((c) => ({ player: p.id, at: c.at, gcd: false, castMs: 0 })));
    weaving.lightspeed(
      p.id,
      [...planned, ...own].map((u) => ({ from: u.at, to: u.at + LIGHTSPEED_MS })),
    );
  }
  return uses;
}

// A replanned astrologian's other Lightspeed charge, planned: used whenever
// a charge is there to spare, in the first weave slot, so it never sits at
// two and its faster casts free as much weave room as they can.
function secondCharges(
  player: number,
  durationMs: number,
  catalog: ActionCatalog,
  weaving: Weaving,
  uses: PlannedUse[],
): PlannedUse[] {
  const lightspeed = catalog.actions.find((a) => a.id === LIGHTSPEED);
  if (!lightspeed) return [];
  const times = uses.filter((u) => u.player === player && u.action === LIGHTSPEED).map((u) => u.at);
  const added: PlannedUse[] = [];
  for (let at = 0; at < durationMs; at += STEP_MS) {
    if (!fitsRecast(times, at, lightspeed.recastMs, lightspeed.charges)) continue;
    const taken = [...times.map((t) => ({ at: t, gcd: false, castMs: 0 }))];
    const slot = weaving.ogcdAfter(player, at, at + STEP_MS, taken);
    if (slot === null || !fitsRecast(times, slot, lightspeed.recastMs, lightspeed.charges)) continue;
    times.push(slot);
    added.push({ player, action: LIGHTSPEED, name: lightspeed.name, at: slot, target: null, covers: [] });
  }
  return added;
}
