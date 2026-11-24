import { ActionCatalog, CatalogAction, PullTimeline } from '@everise/core/api-types';
import {
  TOXIKONS,
  pressedFirst,
  catalogAtLevel,
  gaugeAtPull,
  hasTankGauge,
  limitBreakLevel,
  healPower,
  pullLevel,
  stingsAtPull,
  stingsFrom,
  spendsShort,
  unpaidToxikons,
  withoutFollowUps,
  type Plan,
} from '@everise/planner/scheduler';
import {
  aetherflowAtPull,
  aetherflowShort,
  enablersMissing,
  poolsShort,
  recastsShort,
  weavesShort,
} from './legality-rules';
import { asPlayed } from './plan-as-played';
import type { ImpossibleCast, Lacking, LegalityCast, PlanLegality } from './plan-legality.model';

// A cast kept as played this close to the log's is that cast.
const SAME_MS = 100;

// What each replanned player's column of the plan has them press (the plan's uses and what it keeps as they played:
// the column the page shows) that they couldn't have: a cooldown not back, a status that enables it not up (Baneful
// Impaction without Chain Stratagem's Impact Imminent), a third oGCD between two GCDs where it can't fit, or a gauge
// or stack it spends not there (Aetherflow, Addersgall, lilies, Beast/Blood/Cartridges, Addersting). The log's own
// casts go through the same rules: what fails there is the rules' blind spot or the log's noise. Not checked: MP (the
// plan's `mpShort`), the Oath gauge, cards and the Faerie Gauge.
export function planLegality(plan: Plan, timeline: PullTimeline, full: ActionCatalog): PlanLegality {
  const judge = legalityJudge(timeline, full);
  const result: PlanLegality = { plan: [], log: [] };
  for (const player of replannedIn(plan, timeline)) {
    const judged = judge(plan, player.id);
    result.plan.push(...judged.plan);
    result.log.push(...judged.log);
  }
  const order = (a: ImpossibleCast, b: ImpossibleCast) => a.at - b.at || a.player - b.player;
  return { plan: result.plan.sort(order), log: result.log.sort(order) };
}

export const replannedIn = (plan: Plan, timeline: PullTimeline) =>
  timeline.players.filter((p) => !plan.replanned || plan.replanned.includes(p.id));

// What judges a replanned player's column of a plan of the pull (`planLegality`), what stays the same made once: the
// casts kept as played (`played`, as it returns them) can be given, where only the plan's own moved.
export function legalityJudge(timeline: PullTimeline, full: ActionCatalog) {
  const level = pullLevel(timeline);
  const catalog = catalogAtLevel(full, level);
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  // An action not learnt yet at the pull's level (Scarlet Delirium at 90).
  const unlearnt = new Map(full.actions.filter((a) => !byId.has(a.id)).map((a) => [a.id, a]));
  const power = healPower(timeline, catalog);
  const ofPlayer = new Map<number, ReturnType<typeof playerRules>>();
  const rulesOf = (id: number) => {
    const known = ofPlayer.get(id);
    if (known) return known;
    const made = playerRules(timeline, catalog, byId, id);
    ofPlayer.set(id, made);
    return made;
  };
  return (plan: Plan, id: number, played?: LegalityCast[]) => {
    const { job, mine, log, check, logLacking } = rulesOf(id);
    const kept = played ?? playedColumn(plan, timeline, id, catalog, mine);
    const column = [...ownColumn(plan, id, mine), ...kept].sort((a, b) => a.at - b.at);
    const lacking = [...check(column), ...notLearnt(column, unlearnt, level)];
    if (job === 'SGE') lacking.push(...stingsShort(plan, timeline, catalog, id, power.get(id) ?? 0, column, log));
    const named = (l: Lacking): ImpossibleCast => ({ ...l.cast, player: id, rule: l.rule, needs: l.needs });
    // A cast kept as played that fails as the log's own does is the rules' blind spot (a recast a proc reset), not
    // the plan's doing.
    const sameInLog = (l: Lacking) =>
      l.cast.source === 'played' &&
      logLacking.some(
        (o) => o.rule === l.rule && o.cast.action === l.cast.action && Math.abs(o.cast.at - l.cast.at) < SAME_MS,
      );
    const order = (a: ImpossibleCast, b: ImpossibleCast) => a.at - b.at;
    return {
      plan: lacking
        .filter((l) => !sameInLog(l))
        .map(named)
        .sort(order),
      log: logLacking.map(named),
      played: kept,
    };
  };
}

// A player's rules, and what their log breaks of them.
function playerRules(timeline: PullTimeline, catalog: ActionCatalog, byId: Map<number, CatalogAction>, id: number) {
  const job = timeline.players.find((p) => p.id === id)?.job ?? '';
  const mine = catalog.actions.filter((a) => a.jobs.includes(job));
  const log: LegalityCast[] = withoutFollowUps(
    timeline.playerCasts.filter((c) => c.source === id),
    catalog,
  ).map((c) => ({ action: c.action, at: c.at, source: 'log' as const }));
  const start = aetherflowAtPull(log);
  const gaugeStart = hasTankGauge(job) ? gaugeAtPull(job, log.map(asGauge), catalog) : 0;
  const check = (casts: LegalityCast[]): Lacking[] => [
    ...recastsShort(casts, byId, mine),
    ...enablersMissing(casts, mine, byId),
    ...poolsShort(casts),
    // A Limit Break is no weave: its own long lock, kept where the group used it.
    ...weavesShort(
      casts.filter((c) => !limitBreakLevel(c.action)),
      byId,
    ),
    ...(job === 'SCH' ? aetherflowShort(casts, start) : []),
    ...(hasTankGauge(job) ? gaugeShort(job, casts, catalog, gaugeStart) : []),
  ];
  return { job, mine, log, check, logLacking: check(log) };
}

// A player's own column: the plan's uses, and what they press first (Tempera Coat before Tempera Grassa,
// Improvisation before its finish), just before.
function ownColumn(plan: Plan, player: number, mine: CatalogAction[]): LegalityCast[] {
  const byName = byNameOf(mine);
  // Not a second press (Horoscope read, Kardia put back) nor an event: neither spends a cooldown.
  const uses = plan.uses.filter((u) => u.player === player && !u.again);
  const first = uses.flatMap((u) => {
    const action = byName.get(pressedFirst(u.action) ?? '');
    return action === undefined ? [] : [{ action, at: u.at - 1, source: 'plan' as const }];
  });
  return [...first, ...uses.map((u) => ({ action: u.action, at: u.at, source: 'plan' as const }))];
}

// What the column keeps as they played.
function playedColumn(
  plan: Plan,
  timeline: PullTimeline,
  player: number,
  catalog: ActionCatalog,
  mine: CatalogAction[],
): LegalityCast[] {
  const byName = byNameOf(mine);
  return asPlayed(plan, timeline, player, catalog).flatMap((entry) => {
    const action = byName.get(entry.action);
    return action === undefined ? [] : [{ action, at: entry.at, source: 'played' as const }];
  });
}

// By name, as the column has them; of two by one name (Quadruple Technical Finish), the one with a tooltip.
function byNameOf(mine: CatalogAction[]) {
  const known = BY_NAME.get(mine);
  if (known) return known;
  const byName = new Map<string, number>();
  BY_NAME.set(mine, byName);
  for (const a of [...mine].sort((x, y) => Number(!!x.description) - Number(!!y.description))) byName.set(a.name, a.id);
  return byName;
}

// Each cast of an action the pull's level doesn't have.
function notLearnt(casts: LegalityCast[], unlearnt: Map<number, CatalogAction>, level: number): Lacking[] {
  return casts.flatMap((cast) => {
    const action = unlearnt.get(cast.action);
    return action ? [{ cast, rule: 'level' as const, needs: `level ${action.level} (the pull is at ${level})` }] : [];
  });
}

const BY_NAME = new WeakMap<CatalogAction[], Map<string, number>>();

const asGauge = (c: LegalityCast) => ({ action: c.action, at: c.at, own: false });

// A tank's spends their gauge can't pay for as it stands (`spendsShort`), from what their log needed at the pull.
function gaugeShort(job: string, casts: LegalityCast[], catalog: ActionCatalog, start: number): Lacking[] {
  const gauge = casts.map((c) => ({ ...asGauge(c), cast: c }));
  return spendsShort(job, gauge, catalog, start).map((g) => ({
    cast: g.cast,
    rule: 'gauge' as const,
    needs: `${job} gauge`,
  }));
}

// A sage's Toxikons with no Addersting: the stings the plan's own barriers give, from what their log needed.
function stingsShort(
  plan: Plan,
  timeline: PullTimeline,
  catalog: ActionCatalog,
  sage: number,
  power: number,
  column: LegalityCast[],
  log: LegalityCast[],
): Lacking[] {
  const sting = (c: LegalityCast, own: boolean) => ({ action: c.action, at: c.at, target: null, own });
  const played = timeline.playerCasts
    .filter((c) => c.source === sage)
    .map((c) => ({ action: c.action, at: c.at, target: c.target ?? null, own: false }));
  const start = stingsAtPull(
    log.filter((c) => TOXIKONS.has(c.action)).map((c) => sting(c, false)),
    stingsFrom(timeline, catalog, sage, power, played),
  );
  const barriers = plan.uses
    .filter((u) => u.player === sage)
    .map((u) => ({ action: u.action, at: u.at, target: u.target, own: true }));
  const toxikons = column.filter((c) => TOXIKONS.has(c.action)).map((c) => ({ ...sting(c, false), cast: c }));
  const unpaid = unpaidToxikons(toxikons, stingsFrom(timeline, catalog, sage, power, barriers), start);
  return toxikons
    .filter((t) => unpaid.has(t))
    .map((t) => ({ cast: t.cast, rule: 'addersting' as const, needs: 'Addersting' }));
}
