import { ActionCatalog, CatalogAction, PullTimeline } from '@everise/core/api-types';
import {
  TOXIKONS,
  pressedFirst,
  catalogAtLevel,
  gaugeAtPull,
  hasTankGauge,
  healPower,
  pullLevel,
  stingsAtPull,
  stingsFrom,
  unpaidSpends,
  unpaidToxikons,
  withoutFollowUps,
  type Plan,
} from '@everise/planner/scheduler';
import { aetherflowAtPull, aetherflowShort, enablersMissing, poolsShort, recastsShort } from './legality-rules';
import { asPlayed } from './plan-as-played';
import type { ImpossibleCast, Lacking, LegalityCast, PlanLegality } from './plan-legality.model';

// A cast kept as played this close to the log's is that cast.
const SAME_MS = 100;

// What each replanned player's column of the plan has them press (the plan's uses and what it keeps as they played:
// the column the page shows) that they couldn't have: a cooldown not back, a status that enables it not up (Baneful
// Impaction without Chain Stratagem's Impact Imminent), or a gauge or stack it spends not there (Aetherflow,
// Addersgall, lilies, Beast/Blood/Cartridges, Addersting). The log's own casts go through the same rules: what fails
// there is the rules' blind spot or the log's noise. Not checked: MP (the plan's `mpShort`), the Oath gauge, cards
// and the Faerie Gauge.
export function planLegality(plan: Plan, timeline: PullTimeline, full: ActionCatalog): PlanLegality {
  const catalog = catalogAtLevel(full, pullLevel(timeline));
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const power = healPower(timeline, catalog);
  const result: PlanLegality = { plan: [], log: [] };
  const replanned = timeline.players.filter((p) => !plan.replanned || plan.replanned.includes(p.id));
  for (const player of replanned) {
    const job = player.job ?? '';
    const mine = catalog.actions.filter((a) => a.jobs.includes(job));
    const log: LegalityCast[] = withoutFollowUps(
      timeline.playerCasts.filter((c) => c.source === player.id),
      catalog,
    ).map((c) => ({ action: c.action, at: c.at, source: 'log' as const }));
    const column = planColumn(plan, timeline, player.id, catalog, mine);
    const start = aetherflowAtPull(log);
    const gaugeStart = hasTankGauge(job) ? gaugeAtPull(job, log.map(asGauge), catalog) : 0;
    const check = (casts: LegalityCast[]): Lacking[] => [
      ...recastsShort(casts, byId, mine),
      ...enablersMissing(casts, mine, byId),
      ...poolsShort(casts),
      ...(job === 'SCH' ? aetherflowShort(casts, start) : []),
      ...(hasTankGauge(job) ? gaugeShort(job, casts, catalog, gaugeStart) : []),
    ];
    const lacking = [...check(column)];
    if (job === 'SGE')
      lacking.push(...stingsShort(plan, timeline, catalog, player.id, power.get(player.id) ?? 0, column, log));
    const named = (l: Lacking): ImpossibleCast => ({ ...l.cast, player: player.id, rule: l.rule, needs: l.needs });
    const logLacking = check(log);
    // A cast kept as played that fails as the log's own does is the rules' blind spot (a recast a proc reset), not
    // the plan's doing.
    const sameInLog = (l: Lacking) =>
      l.cast.source === 'played' &&
      logLacking.some(
        (o) => o.rule === l.rule && o.cast.action === l.cast.action && Math.abs(o.cast.at - l.cast.at) < SAME_MS,
      );
    result.plan.push(...lacking.filter((l) => !sameInLog(l)).map(named));
    result.log.push(...logLacking.map(named));
  }
  const order = (a: ImpossibleCast, b: ImpossibleCast) => a.at - b.at || a.player - b.player;
  return { plan: result.plan.sort(order), log: result.log.sort(order) };
}

// A player's column: the plan's uses and what it keeps as they played, in time order.
function planColumn(
  plan: Plan,
  timeline: PullTimeline,
  player: number,
  catalog: ActionCatalog,
  mine: CatalogAction[],
): LegalityCast[] {
  // By name, as the column has them; of two by one name (Quadruple Technical Finish), the one with a tooltip.
  const byName = new Map<string, number>();
  for (const a of [...mine].sort((x, y) => Number(!!x.description) - Number(!!y.description))) byName.set(a.name, a.id);
  // Not a second press (Horoscope read, Kardia put back) nor an event: neither spends a cooldown.
  const uses = plan.uses.filter((u) => u.player === player && !u.again);
  // What they press first (Tempera Coat before Tempera Grassa, Improvisation before its finish), just before.
  const first = uses.flatMap((u) => {
    const action = byName.get(pressedFirst(u.action) ?? '');
    return action === undefined ? [] : [{ action, at: u.at - 1, source: 'plan' as const }];
  });
  const own = [...first, ...uses.map((u) => ({ action: u.action, at: u.at, source: 'plan' as const }))];
  const played = asPlayed(plan, timeline, player, catalog).flatMap((entry) => {
    const action = byName.get(entry.action);
    return action === undefined ? [] : [{ action, at: entry.at, source: 'played' as const }];
  });
  return [...own, ...played].sort((a, b) => a.at - b.at);
}

const asGauge = (c: LegalityCast) => ({ action: c.action, at: c.at, own: false });

// A tank's spends their gauge can't pay for (`unpaidSpends`), from what their log needed at the pull.
function gaugeShort(job: string, casts: LegalityCast[], catalog: ActionCatalog, start: number): Lacking[] {
  const gauge = casts.map((c) => ({ ...asGauge(c), cast: c }));
  const unpaid = unpaidSpends(job, gauge, catalog, start);
  return gauge
    .filter((g) => unpaid.has(g))
    .map((g) => ({ cast: g.cast, rule: 'gauge' as const, needs: `${job} gauge` }));
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
