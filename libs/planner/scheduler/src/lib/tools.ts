import { ActionCatalog, ActionEffect, CatalogAction, TimelinePlayer } from '@everise/core/api-types';
import { MitigationEffect, MitigationTool, ToolPool } from './plan.model';

// Actions a trait replaces, and what with: from that action's level, the
// old one is gone from the hotbar. (The catalog lists both, for lower-level
// content.)
const REPLACED_BY: Record<number, number> = {
  17: 36920, // Sentinel → Guardian
  44: 36923, // Vengeance → Damnation
  3636: 36927, // Shadow Wall → Shadowed Vigil
  16148: 36935, // Nebula → Great Nebula
  3551: 25751, // Raw Intuition → Bloodwhetting
  16161: 25758, // Heart of Stone → Heart of Corundum
  3542: 25746, // Sheltron → Holy Sheltron
  7498: 36962, // Third Eye → Tengentsu
  24288: 24302, // Physis → Physis II
  3601: 37030, // Aspected Helios → Helios Conjunction
  133: 37010, // Medica II → Medica III
};

// Statuses that don't stack with each other, though they differ.
const SAME_STACK: Record<string, string> = {
  Troubadour: 'ranged party mitigation',
  Tactician: 'ranged party mitigation',
  'Shield Samba': 'ranged party mitigation',
  Kerachole: 'Kerachole or Taurochole',
  Taurochole: 'Kerachole or Taurochole',
};

// What really limits some actions, rather than their recast: the Oath
// gauge (50 of it about every 25 seconds of auto-attacks, up to 100),
// Aetherflow and Addersgall (about one every 20 seconds, up to 3), the
// Astrologian's card draw (every 60 seconds), and Suntouched (from Neutral
// Sect, every 120 seconds). One a use, as the planner counts them.
const OATH: ToolPool = { name: 'Oath Gauge', gainMs: 25_000, max: 2 };
const AETHERFLOW: ToolPool = { name: 'Aetherflow', gainMs: 20_000, max: 3 };
const ADDERSGALL: ToolPool = { name: 'Addersgall', gainMs: 20_000, max: 3 };
const CARD: ToolPool = { name: 'Play II', gainMs: 60_000, max: 1 };
const SUNTOUCHED: ToolPool = { name: 'Suntouched', gainMs: 120_000, max: 1 };
const POOLS: Record<number, ToolPool> = {
  3542: OATH, // Sheltron
  25746: OATH, // Holy Sheltron
  7382: OATH, // Intervention
  188: AETHERFLOW, // Sacred Soil
  24298: ADDERSGALL, // Kerachole
  24303: ADDERSGALL, // Taurochole
  37027: CARD, // the Bole
  37031: SUNTOUCHED, // Sun Sign
};

// Conditions the planner can take as met: it assumes everyone stands where
// the effect lands.
const ASSUMED = new Set(['behind the paladin']);

// The mitigations each player of the pull has, at their level.
export function mitigationTools(players: TimelinePlayer[], catalog: ActionCatalog): MitigationTool[] {
  const byId = new Map(catalog.actions.map((action) => [action.id, action]));
  const tools: MitigationTool[] = [];
  for (const player of players) {
    if (!player.job) continue;
    const level = player.stats?.level ?? 100;
    for (const action of catalog.actions) {
      if (!action.jobs.includes(player.job) || action.level > level) continue;
      const upgrade = byId.get(REPLACED_BY[action.id]);
      if (upgrade && upgrade.level <= level) continue;
      const effects = mitigationEffects(action);
      if (!effects.length) continue;
      tools.push({
        player: player.id,
        action: action.id,
        name: action.name,
        recastMs: action.recastMs,
        charges: action.charges,
        group: `${player.id}:${action.cooldownGroup}`,
        pool: POOLS[action.id] ?? null,
        effects,
      });
    }
  }
  return tools;
}

function mitigationEffects(action: CatalogAction): MitigationEffect[] {
  return action.effects
    .filter((e) => e.kind === 'mitigation' && e.durationMs && (!e.condition || ASSUMED.has(e.condition)))
    .map((e) => {
      const status = e.status ?? action.name;
      return {
        target: e.target,
        share: shareOf(e) / 100,
        durationMs: e.durationMs as number,
        status,
        stack: SAME_STACK[status] ?? status,
      };
    })
    .filter((e) => e.share > 0);
}

// The share taken off; where physical and magic differ, the smaller.
function shareOf(e: ActionEffect) {
  if (e.percent !== null) return e.percent;
  return Math.min(e.physical ?? 0, e.magic ?? 0);
}
