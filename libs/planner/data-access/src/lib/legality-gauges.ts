import type { Lacking, LegalityCast } from './plan-legality.model';

// An astrologian's cards, by the draw that gives them: Astral Draw the Balance, the Arrow, the Spire and the Lord of
// Crowns; Umbral Draw the Spear, the Bole, the Ewer and the Lady of Crowns. Each draw takes away what the one before
// left (its tooltip: "Play I changes to…").
const ASTRAL_DRAW = 37017;
const UMBRAL_DRAW = 37018;
const CARDS: Record<number, number> = {
  37023: ASTRAL_DRAW, // the Balance
  37024: ASTRAL_DRAW, // the Arrow
  37025: ASTRAL_DRAW, // the Spire
  7444: ASTRAL_DRAW, // Lord of Crowns
  37026: UMBRAL_DRAW, // the Spear
  37027: UMBRAL_DRAW, // the Bole
  37028: UMBRAL_DRAW, // the Ewer
  7445: UMBRAL_DRAW, // Lady of Crowns
};

// Each card played with no draw of its kind since, or played twice from one draw. Before the first draw, anything goes
// (the countdown's draw can be missing from a log).
export function cardsShort(casts: LegalityCast[]): Lacking[] {
  const out: Lacking[] = [];
  let draw: number | null = null;
  let played = new Set<number>();
  for (const cast of casts) {
    if (cast.action === ASTRAL_DRAW || cast.action === UMBRAL_DRAW) {
      draw = cast.action;
      played = new Set();
      continue;
    }
    const from = CARDS[cast.action];
    if (from === undefined || draw === null) continue;
    if (from !== draw || played.has(cast.action))
      out.push({ cast, rule: 'card', needs: from === ASTRAL_DRAW ? 'Astral Draw' : 'Umbral Draw' });
    else played.add(cast.action);
  }
  return out;
}

// A paladin's Oath Gauge: 5 for each auto-attack (one every 2.24s, so 50 every 22.4s; a little sooner counts, for
// timing noise), up to 100; Sheltron, Holy Sheltron and Intervention cost 50.
const OATH_SPENDS = new Set([3542, 25746, 7382]);
const OATH_COST = 50;
const OATH_MAX = 100;
const OATH_GAIN_MS = 21_000;

// Full at the pull, as the plan has it (`OATH` in tools.ts; the logs' paladins spend two at once early).
export function oathShort(casts: LegalityCast[]): Lacking[] {
  const out: Lacking[] = [];
  let gauge = OATH_MAX;
  let last = 0;
  for (const cast of casts) {
    if (!OATH_SPENDS.has(cast.action)) continue;
    gauge = Math.min(OATH_MAX, gauge + (OATH_COST * Math.max(0, cast.at - last)) / OATH_GAIN_MS);
    last = cast.at;
    if (gauge < OATH_COST) out.push({ cast, rule: 'oath', needs: `${OATH_COST} Oath Gauge` });
    else gauge -= OATH_COST;
  }
  return out;
}

// A scholar's Faerie Gauge: empty at the pull, 10 for each Aetherflow stack spent (Energy Drain, Sacred Soil,
// Lustrate, Indomitability, Excogitation; not one Recitation made free), up to 100. Aetherpact costs 10 and its Fey
// Union takes 10 a tick (3s) until Dissolve Union, another faerie action, or the gauge runs out. The plan's own
// Aetherpacts have no Dissolve Union: each holds its union 4 ticks (`FEY_UNION_TICKS`).
const AETHERPACT = 7437;
const DISSOLVE_UNION = 7869;
const FAERIE_FILLS = new Set([167, 188, 189, 3583, 7434]);
const RECITATION = 16542;
const RECITED = new Set([185, 37013, 3583, 7434]);
// What ends a Fey Union besides Dissolve Union: the faerie's other actions, and Dissipation sending her away.
const FAERIE_ACTIONS = new Set([16537, 16538, 16543, 16545, 3587, 17215]);
const TICK_MS = 3000;
const PLAN_TICKS = 4;
const FAERIE_MAX = 100;
const UNION_COST = 10;

export function faerieShort(casts: LegalityCast[]): Lacking[] {
  const out: Lacking[] = [];
  let gauge = 0;
  let recited = false;
  // The Fey Union held: since when, and until when at most (the plan's: 4 ticks).
  let union: { from: number; until: number } | null = null;
  const drain = (at: number) => {
    if (!union) return;
    const end = Math.min(at, union.until);
    const ticks = Math.floor((end - union.from) / TICK_MS);
    gauge = Math.max(0, gauge - ticks * UNION_COST);
    union.from += ticks * TICK_MS;
    if (at >= union.until || gauge === 0) union = null;
  };
  for (const cast of casts) {
    drain(cast.at);
    if (cast.action === RECITATION) recited = true;
    else if (recited && RECITED.has(cast.action)) recited = false;
    else if (FAERIE_FILLS.has(cast.action)) gauge = Math.min(FAERIE_MAX, gauge + UNION_COST);
    if (cast.action === DISSOLVE_UNION || FAERIE_ACTIONS.has(cast.action)) union = null;
    if (cast.action !== AETHERPACT) continue;
    if (gauge < UNION_COST) {
      out.push({ cast, rule: 'faerie gauge', needs: `${UNION_COST} Faerie Gauge` });
      continue;
    }
    gauge -= UNION_COST;
    union = { from: cast.at, until: cast.source === 'plan' ? cast.at + PLAN_TICKS * TICK_MS : Infinity };
  }
  return out;
}
