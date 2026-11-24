import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import { pressedFirst, type Plan, type PlannedUse } from '@everise/planner/scheduler';
import { legalityJudge, replannedIn } from './plan-legality';
import type { ImpossibleCast, LegalityCast } from './plan-legality.model';

// How far apart the times a cast of the plan's is tried at, later, to find where it can be pressed.
const STEP_MS = 1_000;
// How much later at most: past this, it goes.
const LATEST_MS = 180_000;
// A bound on the fixes for one player in a round, should one undo another.
const MAX_FIXES = 200;
// Rounds: what they played kept as it is in each, judged again whole after it (a cast moved changes what the gauge
// pays for of theirs).
const ROUNDS = 4;

type Judge = ReturnType<typeof legalityJudge>;

// The plan with nothing in a replanned player's column they couldn't press (`planLegality`), the earliest first, as
// what comes after hangs on it (a Fell Cleave withheld cuts Infuriate's recast no more): a cast kept as played is
// withheld (their usual attack in a GCD's slot); one the plan placed for no hit (Infuriate, Lightspeed, Dissipation)
// goes to the first time it can be pressed that breaks nothing else, else away. Its mitigations and heals stay: the
// plan's rules keep them possible.
export function withLegalCasts(plan: Plan, timeline: PullTimeline, catalog: ActionCatalog): Plan {
  const judge = legalityJudge(timeline, catalog);
  let fixed = plan;
  for (const { id } of replannedIn(plan, timeline)) {
    for (let round = 0; round < ROUNDS; round++) {
      const whole = judge(fixed, id);
      if (!whole.plan.length) break;
      fixed = fixedRound(fixed, whole, judge, id, timeline.durationMs);
    }
  }
  return fixed;
}

// One round for a player: their casts as played as `judged` has them.
function fixedRound(plan: Plan, judged: Judged, judge: Judge, id: number, endMs: number): Plan {
  const stuck = new Set<string>();
  let [fixed, state] = [plan, judged];
  for (let i = 0; i < MAX_FIXES; i++) {
    const first = state.plan.find((c) => !stuck.has(keyOf(c)));
    if (!first) break;
    const next =
      first.source === 'played' ? withheld(fixed, first, state, judge) : moved(fixed, first, state, judge, endMs);
    if (next) [fixed, state] = next;
    else stuck.add(keyOf(first));
  }
  return fixed;
}

const keyOf = (c: ImpossibleCast) => `${c.rule}:${c.action}:${c.at}`;

type Judged = { plan: ImpossibleCast[]; played: LegalityCast[] };

// A cast kept as played, withheld.
function withheld(plan: Plan, cast: ImpossibleCast, state: Judged, judge: Judge): [Plan, Judged] {
  const next = {
    ...plan,
    withheld: [...(plan.withheld ?? []), { player: cast.player, action: cast.action, at: cast.at }],
  };
  const played = state.played.filter((c) => c.action !== cast.action || c.at !== cast.at);
  return [next, judge(next, cast.player, played)];
}

// A cast the plan placed, at the first time it can be pressed, else away.
function moved(plan: Plan, cast: ImpossibleCast, state: Judged, judge: Judge, endMs: number): [Plan, Judged] | null {
  // The use, or the one it is pressed just before (Tempera Grassa's Tempera Coat).
  const use = plan.uses.find(
    (u) =>
      u.player === cast.player &&
      ((u.action === cast.action && u.at === cast.at) ||
        ((u.firstAt ?? u.at - 1) === cast.at && !!pressedFirst(u.action))),
  );
  if (!use || !movable(use)) return null;
  const known = new Set(state.plan.map(keyOf));
  // It no longer fails, and nothing breaks that didn't but what comes later and can be fixed in turn: what follows from
  // it (an Inner Chaos its Infuriate, moved, no longer pays for; the next Infuriate, moved on as well).
  const fixable = (next: Plan, after: ImpossibleCast[], at: number | null) =>
    !after.some(
      (c) => keyOf(c) === keyOf(cast) || (c.action === cast.action && at !== null && c.at === at - (use.at - cast.at)),
    ) && after.every((c) => known.has(keyOf(c)) || (c.at > cast.at && canFix(next, c)));
  const others = plan.uses.filter((u) => u !== use);
  const tries: (number | null)[] = [];
  for (let at = use.at + STEP_MS; at <= Math.min(use.at + LATEST_MS, endMs); at += STEP_MS) tries.push(at);
  for (const at of [...tries, null]) {
    const uses = at === null ? others : [...others, { ...use, at }].sort((a, b) => a.at - b.at || a.player - b.player);
    const next = { ...plan, uses };
    const after = judge(next, cast.player, state.played);
    if (fixable(next, after.plan, at)) return [next, after];
  }
  return null;
}

// A cast kept as played, or one the plan placed that can move.
function canFix(plan: Plan, c: ImpossibleCast) {
  if (c.source === 'played') return true;
  const use = plan.uses.find((u) => u.player === c.player && u.at === c.at && u.action === c.action);
  return !!use && movable(use);
}

// One the plan placed for no hit, not by the user: a buff, a burst, a resource.
const movable = (u: PlannedUse) => !u.covers.length && !u.edited && !u.raise && !u.gauge && !u.played;
