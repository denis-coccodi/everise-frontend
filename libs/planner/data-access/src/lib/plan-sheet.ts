import type { ActionCatalog, CatalogAction, TimelinePlayer } from '@everise/core/api-types';
import { playerActions, type Mechanic, type Plan, type ReferencedTimeline } from '@everise/planner/scheduler';
import { dealsDamage, onlyDamage } from './action-kinds';
import type { PlanSheet, SheetRole, SheetRow, SheetSkill } from './plan-sheet.model';

// A cast as played goes on the row of the attack it was for: the next one
// within this long that hits them or the party.
const FOR_NEXT_MS = 30_000;
// A use of the plan's this close to one of their casts is that cast.
const SAME_CAST_MS = 2_500;
// A use the plan times just after an attack's first hit is still for it.
const LATE_MS = 1_000;
const ROLE_ORDER: SheetRole[] = ['tank', 'healer', 'dps'];
// The jobs' numbers in the game: a job's framed icon is 62100 plus its number.
const JOB_NUMBERS: Record<string, number> = {
  PLD: 19,
  MNK: 20,
  WAR: 21,
  DRG: 22,
  BRD: 23,
  WHM: 24,
  BLM: 25,
  SMN: 27,
  SCH: 28,
  NIN: 30,
  MCH: 31,
  DRK: 32,
  AST: 33,
  SAM: 34,
  RDM: 35,
  BLU: 36,
  GNB: 37,
  DNC: 38,
  RPR: 39,
  SGE: 40,
  VPR: 41,
  PCT: 42,
};
const JOB_ICONS_FROM = 62100;

// The plan as a raid group's mitigation sheet: a row per boss attack, in
// time order, and for each player what they use for it. Players the plan
// replans: its uses, on the row of the first attack each covers. Players it
// leaves as played: their mitigations, shields and heals as they cast them,
// on the row of the next attack. Players a completed wipe plans only from
// its wipe point: as played up to it, the plan's after.
export function planSheet(plan: Plan, timeline: ReferencedTimeline, catalog: ActionCatalog): PlanSheet {
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const mechanics = [...plan.mechanics].sort((a, b) => a.at - b.at);
  const ordered = [...timeline.players].sort((a, b) => rank(a) - rank(b));
  const skill = (id: number, name?: string): SheetSkill => ({
    name: byId.get(id)?.name ?? name ?? String(id),
    icon: byId.get(id)?.icon ?? null,
  });
  const cells = new Map(mechanics.map((m) => [m.id, ordered.map((): SheetSkill[] => [])]));
  const put = (mechanic: Mechanic | undefined, column: number, s: SheetSkill) => {
    const cell = mechanic && cells.get(mechanic.id)?.[column];
    if (cell && !cell.some((c) => c.name === s.name)) cell.push(s);
  };
  ordered.forEach((player, column) => {
    // The plan's uses for an attack. Not those it lists for none (the casts
    // of a player taken from a kill, kept as they were): their casts below
    // place them, so only these count as the plan's.
    const mine = plan.uses.filter((u) => u.player === player.id && mechanics.some((m) => u.covers.includes(m.id)));
    for (const use of mine) {
      const covered = mechanics.filter((m) => use.covers.includes(m.id));
      put(covered.find((m) => m.at >= use.at - LATE_MS) ?? covered[0], column, skill(use.action, use.name));
    }
    // As played: all through for those the plan leaves so, up to the wipe
    // point for those it plans only from there (`late`), else not at all.
    const replanned = !plan.replanned || plan.replanned.includes(player.id);
    const late = plan.late?.includes(player.id) && timeline.completion;
    const playedUntil = late ? late.from : replanned ? -Infinity : Infinity;
    for (const cast of timeline.playerCasts.filter((c) => c.source === player.id && c.at < playedUntil)) {
      if (!protective(cast.action, byId.get(cast.action))) continue;
      if (mine.some((u) => u.action === cast.action && Math.abs(u.at - cast.at) < SAME_CAST_MS)) continue;
      const next = mechanics.find(
        (m) =>
          m.at >= cast.at &&
          m.at - cast.at <= FOR_NEXT_MS &&
          (m.kind !== 'targeted' || m.hits.some((h) => h.player === player.id)),
      );
      put(next, column, skill(cast.action));
    }
  });
  const completedFrom = timeline.completion?.from ?? null;
  const rows: SheetRow[] = mechanics.map((m) => ({
    at: m.at,
    mechanic: m.name,
    kind: m.kind,
    damageType: m.damageType,
    damage: median(m.hits.map((h) => h.unmitigated)),
    wipe: !!m.wipe,
    completed: completedFrom !== null && m.at > completedFrom,
    cells: cells.get(m.id) ?? [],
  }));
  const players = ordered.map((p, column) => {
    const used = rows.flatMap((r) => r.cells[column]);
    const offered = playerActions(p, catalog).filter((a) => protective(a.id, a));
    const choices = [...new Map([...offered.map((a) => skill(a.id)), ...used].map((s) => [s.name, s])).values()];
    return {
      id: p.id,
      name: p.name,
      job: p.job,
      jobIcon: p.job && p.job in JOB_NUMBERS ? JOB_ICONS_FROM + JOB_NUMBERS[p.job] : null,
      role: roleOf(p),
      slots: Math.max(1, ...rows.map((r) => r.cells[column].length)),
      choices: choices.sort((a, b) => a.name.localeCompare(b.name)),
    };
  });
  const phases = timeline.phases.map((phase) => ({ at: phase.at, name: phase.name }));
  return { players, rows, completedFrom, phases };
}

// A mitigation, shield, heal or invulnerability: what a sheet plans. Not a
// rotation's weaponskill that heals or shields too (Storm's Path, Brutal
// Shell).
function protective(id: number, action: CatalogAction | undefined) {
  if (!action || onlyDamage(id, action) || (action.gcd && dealsDamage(action))) return false;
  return action.effects.some((e) => e.kind !== 'mp' && e.kind !== 'mpRegen');
}

function roleOf(player: TimelinePlayer): SheetRole {
  return player.role === 'tank' || player.role === 'healer' ? player.role : 'dps';
}

const rank = (player: TimelinePlayer) => ROLE_ORDER.indexOf(roleOf(player));

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
}
