import { CatalogAction } from '@everise/core/api-types';
import {
  AETHERFLOW,
  DISSIPATION,
  POOLS,
  RECITATION,
  RECITED,
  STACK_SPENDS,
  recastMsOf,
} from '@everise/planner/scheduler';
import type { Lacking, LegalityCast } from './plan-legality.model';

// A cast this much before its cooldown is back still counts as on time: the log's timings and the plan's slots are
// a few hundred milliseconds apart.
const TOLERANCE_MS = 1_000;
// How long a granted status lasts where its tooltip doesn't say.
const GRANT_MS = 30_000;
// Afflatus Misery: the Blood Lily blooms after 3 lilies spent (and is in bloom at the pull, since 7.4).
const MISERY = 16535;
const BLOOM = 3;
// Rhizomata: one more Addersgall.
const RHIZOMATA = 24309;

// What a trait takes off a recast, which no tooltip of the action says: Enhanced Infuriate, 5s off Infuriate for each
// Inner Beast, Steel Cyclone, Fell Cleave and Decimate (as `recastCuts` reads a tooltip: [match, action, seconds]).
const INFURIATE_CUT = ['', 'Infuriate', '5'];
const TRAIT_CUTS: Record<number, string[][]> = {
  49: [INFURIATE_CUT],
  51: [INFURIATE_CUT],
  3549: [INFURIATE_CUT],
  3550: [INFURIATE_CUT],
};

// What a cast takes off another's recast, from its tooltip: "Reduces the recast time of Infuriate by 5 seconds"
// (Inner Chaos). Counted even where the tooltip sets a condition (Tempera Coat's, when its barrier breaks): a cast
// is judged impossible only where it surely was.
function recastCuts(action: CatalogAction, mine: CatalogAction[]): { group: number; ms: number }[] {
  const cuts = [
    ...[...(action.description ?? '').matchAll(/reduces the recast time of ([A-Z][\w' ]*?) by (\d+) seconds/gi)],
    ...(TRAIT_CUTS[action.id] ?? []),
  ];
  return cuts.flatMap(([, name, seconds]) => {
    const target = mine.find((a) => a.name === name && recastMsOf(a));
    return target ? [{ group: target.cooldownGroup, ms: +seconds * 1000 }] : [];
  });
}

// Each cast whose cooldown isn't back: per cooldown group, charges come back one at a time, a recast apart (not as a
// window of `charges` uses a recast long: two used, each comes back a recast after the one before).
export function recastsShort(casts: LegalityCast[], byId: Map<number, CatalogAction>, mine: CatalogAction[]) {
  const out: Lacking[] = [];
  const states = new Map<number, { max: number; charges: number; back: number | null; recast: number }>();
  for (const a of mine) {
    if (!recastMsOf(a)) continue;
    const had = states.get(a.cooldownGroup);
    const max = Math.max(had?.max ?? 1, a.charges);
    states.set(a.cooldownGroup, { max, charges: max, back: null, recast: Math.max(had?.recast ?? 0, recastMsOf(a)) });
  }
  // Charges back by `at`.
  const advance = (s: { max: number; charges: number; back: number | null; recast: number }, at: number) => {
    while (s.back !== null && s.back <= at + TOLERANCE_MS) {
      s.charges++;
      s.back = s.charges < s.max ? s.back + s.recast : null;
    }
  };
  for (const cast of casts) {
    const action = byId.get(cast.action);
    if (!action) continue;
    const state = recastMsOf(action) ? states.get(action.cooldownGroup) : undefined;
    if (state) {
      advance(state, cast.at);
      if (state.charges < 1) out.push({ cast, rule: 'recast', needs: `${action.name}'s recast` });
      else {
        state.charges--;
        state.back ??= cast.at + state.recast;
      }
    }
    for (const cut of recastCuts(action, mine)) {
      const target = states.get(cut.group);
      if (target?.back != null) target.back -= cut.ms;
    }
  }
  return out;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .trim();
// The status a cast needs, from "Can only be executed while under the effect of Impact Imminent."; none for the
// conditions the plan doesn't track (in combat, a target, the faerie summoned).
function needOf(action: CatalogAction): string | null {
  const m =
    /can only be executed (?:while|when)(?: under the effect of| you are under the effect of)? ([^.|\n]+?)(?: is active| is in full bloom)?[.\n|]/i.exec(
      action.description ?? '',
    );
  if (!m) return null;
  const need = norm(m[1].replace(/^(a|the) /i, ''));
  return /in combat|faerie is summoned|target|enemy|mounted/.test(need) ? null : need;
}

// How long `granter` grants `need` for ("Grants Impact Imminent … Duration: 30s"), or null when it doesn't. An action
// named as the status grants it too (Delirium).
function grantWindow(granter: CatalogAction, need: string): number | null {
  const text = (granter.description ?? '').replace(/\n/g, ' | ');
  const grants = new RegExp('grants (?:\\d+ stacks of )?' + need).exec(text.toLowerCase());
  if (!grants && granter.name.toLowerCase() !== need) return null;
  const from = grants ? grants.index : text.toLowerCase().indexOf(need + ' ');
  const duration = /Duration: (\d+)s/.exec(text.slice(Math.max(0, from)));
  return duration ? +duration[1] * 1000 : GRANT_MS;
}

// Each cast whose tooltip says it can only be executed under a status no cast of the column granted in time, and each
// Afflatus Misery without 3 lilies spent since the last.
export function enablersMissing(casts: LegalityCast[], mine: CatalogAction[], byId: Map<number, CatalogAction>) {
  const out: Lacking[] = [];
  let lilies = BLOOM;
  for (const cast of casts) {
    const action = byId.get(cast.action);
    if (!action) continue;
    if (POOLS[cast.action]?.name === 'Lily') lilies++;
    if (cast.action === MISERY) {
      if (lilies < BLOOM) out.push({ cast, rule: 'blood lily', needs: '3 lilies spent' });
      else lilies -= BLOOM;
      continue;
    }
    const need = needOf(action);
    if (!need) continue;
    const granters = mine
      .filter((g) => g.id !== action.id)
      .map((g) => ({ id: g.id, window: grantWindow(g, need) }))
      .filter((g): g is { id: number; window: number } => g.window !== null);
    if (!granters.length) continue;
    const granted = casts.some((g) => {
      const window = granters.find((x) => x.id === g.action)?.window;
      return window !== undefined && g.at <= cast.at && cast.at - g.at <= window;
    });
    if (!granted) out.push({ cast, rule: 'enabler', needs: need });
  }
  return out;
}

// Each spend of a pool that fills with time (Addersgall, lilies) with none left: full at the pull, one more every
// `gainMs` up to its `max` (Rhizomata adds one).
export function poolsShort(casts: LegalityCast[]): Lacking[] {
  const out: Lacking[] = [];
  const names = new Set(casts.map((c) => POOLS[c.action]).filter((p) => p && /Addersgall|Lily/.test(p.name)));
  for (const pool of names) {
    let level = pool.max;
    let last = 0;
    for (const cast of casts) {
      const gained = Math.floor((cast.at + TOLERANCE_MS - last) / pool.gainMs);
      if (gained > 0) {
        // While full, the timer runs on and what it fills is lost.
        level = Math.min(pool.max, level + gained);
        last += gained * pool.gainMs;
      }
      if (pool.name === 'Addersgall' && cast.action === RHIZOMATA) level = Math.min(pool.max, level + 1);
      if (POOLS[cast.action] !== pool) continue;
      if (level < 1) out.push({ cast, rule: 'pool', needs: pool.name });
      else level--;
    }
  }
  return out;
}

// Each Aetherflow stack spent with none left, from `start` at the pull: Aetherflow and Dissipation set them to 3;
// Recitation makes the next Indomitability or Excogitation free.
export function aetherflowShort(casts: LegalityCast[], start: number): Lacking[] {
  const out: Lacking[] = [];
  let stacks = start;
  let recited = false;
  for (const cast of casts) {
    if (cast.action === AETHERFLOW || cast.action === DISSIPATION) stacks = 3;
    else if (cast.action === RECITATION) recited = true;
    else if (recited && RECITED.has(cast.action)) recited = false;
    else if (STACK_SPENDS.has(cast.action)) {
      if (stacks < 1) out.push({ cast, rule: 'aetherflow', needs: 'an Aetherflow stack' });
      else stacks--;
    }
  }
  return out;
}

// The fewest stacks at the pull the log's own casts need (none in the game; a log can miss a cast).
export const aetherflowAtPull = (log: LegalityCast[]) =>
  [0, 1, 2, 3].find((start) => !aetherflowShort(log, start).length) ?? 3;
