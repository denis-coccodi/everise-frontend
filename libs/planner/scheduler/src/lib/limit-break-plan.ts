import type { PullTimeline } from '@everise/core/api-types';
import { gaugeAt, limitBreakLevel } from './limit-break-gauge';
import type { GroupLimitBreak } from './limit-break-gauge.model';
import { LEAD_MS } from './mitigation-moments';
import type { Candidate } from './mitigation-plan.model';
import type { Mechanic, MitigationTool, PlannedUse } from './plan.model';

// A level 3 Limit Break's status lands this long after its cast (measured).
const LANDS_MS = 1_300;

// What the mitigation plan lends the last resort: its uses so far, adding
// one, filling a mechanic with the tools it may use, and how many hits of a
// mechanic would still kill.
interface PlanSoFar {
  uses: PlannedUse[];
  add: (candidate: Candidate) => void;
  fill: (m: Mechanic, tools: MitigationTool[]) => void;
  lethal: (m: Mechanic) => number;
}

// The last resort for a mechanic a hit of which would still kill, with
// every mitigation and invulnerability tried (the user, 2026-11-05: "if
// there is no other way to survive"): a replanned tank's level 3 Limit
// Break, up at the hit, where the group had the gauge for it (`gaugeAt`).
// The uses tried for the mechanic give their place back, and are planned
// again with it; it stays only where fewer hits then kill.
export function lastResortFor(
  tools: MitigationTool[],
  gauge: PullTimeline['limitBreakGauge'],
  played: GroupLimitBreak[],
  plan: PlanSoFar,
) {
  const level3 = tools.filter((t) => t.limitBreak && limitBreakLevel(t.action) === 3);
  return (m: Mechanic, tried: number, free: MitigationTool[]) => {
    const before = plan.lethal(m);
    if (!before) return;
    const at = m.at - LEAD_MS;
    const cast = at - LANDS_MS;
    // Those planned already (an earlier round's too), by their casts.
    const planned = plan.uses.filter((u) => u.gauge).map((u) => u.at - LANDS_MS);
    const ok = cast >= 0 ? gaugeAt(cast, gauge, played, planned) : undefined;
    const tool = level3.find((t) => !t.away?.some((a) => a.from <= at && at < a.to));
    if (!ok || !tool) return;
    const back = plan.uses.splice(tried);
    const replaces = ok.replaces && { action: ok.replaces.action, at: ok.replaces.at };
    const use: PlannedUse = {
      ...{ player: tool.player, action: tool.action, name: tool.name, at, target: null, covers: [] },
      gauge: { replaces },
    };
    plan.add({ use, tool, value: 0 });
    plan.fill(m, free);
    if (plan.lethal(m) < before) return;
    plan.uses.splice(tried);
    plan.uses.push(...back);
  };
}
