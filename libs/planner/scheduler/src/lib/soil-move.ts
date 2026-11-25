import { fitsRecast } from './coverage';
import type { Spent } from './heal-plan.model';
import type { HpTrack } from './hp-track';
import type { HpEvent } from './hp-track.model';
import type { HealTool, Mechanic, MitigationTool, PlannedUse } from './plan.model';

const SACRED_SOIL = 188;
// The Aetherflow heals Sacred Soil goes before.
const AFTER_SOIL = new Set([3583, 189]);
// How long Sacred Soil lasts: what it covers from where it's put down.
const SOIL_MS = 15_000;
const SOIL_RECAST_MS = 30_000;

// Where the heals would use a scholar's Indomitability or Lustrate (`pick`: not one Recitation makes critical) with
// their Sacred Soil planned soon after, the Soil that can go there instead: the soonest after it, if put down at the
// pick's moment it still covers every hit it was placed for (`covers`), and its recast fits. As the logs' scholars play
// it, Soil first and its regen heals the damage before those hits too; Indomitability after, where Soil is on
// cooldown (on 16 bench kills, 45% of the logs' Indomitabilities had a Soil in the 15s before, the plan's 15%, and 51%
// one in the 15s after, the logs' 33%). Null where there's none.
export function soilToMove(
  pick: { use: PlannedUse },
  mitigating: PlannedUse[],
  mechanics: Map<number, Mechanic>,
  spent: Spent[],
): PlannedUse | null {
  const { action, player, at, critical } = pick.use;
  if (!AFTER_SOIL.has(action) || critical) return null;
  const soil = mitigating
    .filter((u) => u.action === SACRED_SOIL && u.player === player && u.at > at && u.at <= at + SOIL_MS)
    .sort((a, b) => a.at - b.at)[0];
  if (!soil) return null;
  const still = soil.covers.every((id) => {
    const m = mechanics.get(id);
    return !m || (m.at > at && m.at <= at + SOIL_MS);
  });
  const others = spent.filter((s) => s.action === SACRED_SOIL && s.player === player && s.at !== soil.at);
  return still &&
    fitsRecast(
      others.map((s) => s.at),
      at,
      SOIL_RECAST_MS,
      1,
    )
    ? soil
    : null;
}

// Moves a scholar's Sacred Soil where `soilToMove` says, in place of the pick: its mitigation (`mitigate` adds what
// it covers now), its regen on the HP track (`regenOf`: the events added for each mitigation use), its spend (recast,
// weave slot), and, in what the heal pass returns, the use the mitigation pass placed (`placed`).
export function soilMover(
  mitigating: PlannedUse[],
  mechanics: Mechanic[],
  spent: Spent[],
  track: HpTrack,
  regenOf: Map<PlannedUse, HpEvent[]>,
  toolsOf: (use: PlannedUse) => { mitigation?: MitigationTool; heal?: HealTool },
  eventsFor: (tool: HealTool, use: PlannedUse, delayMs: number) => HpEvent[],
  mitigate: (use: PlannedUse, tool: MitigationTool) => void,
) {
  const byId = new Map(mechanics.map((m) => [m.id, m]));
  const origin = new Map<PlannedUse, PlannedUse>();
  const now = new Map<PlannedUse, PlannedUse>();
  return {
    // Whether a Soil went in for `pick`.
    move(pick: { use: PlannedUse }) {
      const old = soilToMove(pick, mitigating, byId, spent);
      const { mitigation, heal } = old ? toolsOf(old) : {};
      if (!old || !mitigation) return false;
      const use = { ...old, at: pick.use.at, covers: [...old.covers] };
      mitigating.splice(mitigating.indexOf(old), 1);
      mitigate(use, mitigation);
      track.remove(regenOf.get(old) ?? []);
      const regen = heal ? eventsFor(heal, use, 0) : [];
      regenOf.set(use, regen);
      track.add(regen);
      const own = spent.find((x) => x.action === old.action && x.player === old.player && x.at === old.at);
      if (own) own.at = use.at;
      const first = origin.get(old) ?? old;
      origin.set(use, first);
      now.set(first, use);
      return true;
    },
    placed: (use: PlannedUse) => now.get(use) ?? use,
  };
}
