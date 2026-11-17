import { fitsRecast } from './coverage';
import type { MitigationTool, PlanOptions, PlannedUse } from './plan.model';
import type { Weaving } from './weaving';
import type { Occupied } from './weaving.model';

export const ZOE = 24300;
// The heals Zoe makes bigger (the next one within its 30s), barriers too:
// Eukrasian Prognosis (I and II) and Eukrasian Diagnosis.
const BOOSTED = new Set([24292, 37034, 24291]);
const WITHIN_MS = 30_000;
const TIMES = 1.5;

// A sage's GCD shield planned with Zoe in the weave slot before it, its
// barrier 50% bigger (`boost`, which `shieldTimes` sizes it by), where Zoe
// is back: the logs' sages pair 86% of their Zoes with a Eukrasian
// Prognosis, using it whenever it's back, where the plan, pairing it only
// in the heal step, had 22 of 43 such shields go up in an FRU kill with Zoe
// back and unused. Zoe costs nothing, so it's weighed as one more way to
// use the shield (`best` in mitigation-plan.ts): kept where the bigger
// barrier saves more. None on the plan made the old way (`noRaidwideShields:
// 'light'`, a fallback): an FRU kill lost two DPS to Burnished Glory's bleed
// with Zoe on every shield.
export function zoeOptions(
  plannable: MitigationTool[],
  uses: PlannedUse[],
  toolOf: (use: PlannedUse) => MitigationTool,
  occupiedBy: (player: number) => Occupied[],
  weaving: Weaving,
  options: PlanOptions,
) {
  const groupTimes = (group: string) => uses.filter((u) => toolOf(u).group === group).map((u) => u.at);
  return (
    t: MitigationTool,
    at: number,
  ): { granted: { use: PlannedUse; tool: MitigationTool }[]; tool: MitigationTool; boost: number }[] => {
    if (!BOOSTED.has(t.action) || options.noRaidwideShields === 'light') return [];
    const zoe = plannable.find((o) => o.player === t.player && o.action === ZOE);
    if (!zoe) return [];
    const around = [...occupiedBy(t.player), { at, gcd: t.gcd, castMs: t.castMs }];
    const zAt = weaving.ogcdBefore(t.player, at - 1, at - WITHIN_MS + t.castMs, around);
    if (zAt === null || zAt < 0 || !fitsRecast(groupTimes(zoe.group), zAt, zoe.recastMs, zoe.charges)) return [];
    const use = { player: zoe.player, action: zoe.action, name: zoe.name, at: zAt, target: null, covers: [] };
    return [{ granted: [{ use, tool: zoe }], tool: t, boost: TIMES }];
  };
}
