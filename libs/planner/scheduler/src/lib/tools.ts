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
// Astrologian's card draw (every 60 seconds), Suntouched (from Neutral
// Sect, every 120 seconds), Seraph (out every 120 seconds, with two
// Consolations), Tempera Coat (which Tempera Grassa uses up; back in 60
// to 120 seconds), the Lily gauge (one every 20 seconds, up to 3) and the
// Minor Arcana (every 60 seconds). One a use, as the planner counts them.
const OATH: ToolPool = { name: 'Oath Gauge', gainMs: 25_000, max: 2 };
const AETHERFLOW: ToolPool = { name: 'Aetherflow', gainMs: 20_000, max: 3 };
const ADDERSGALL: ToolPool = { name: 'Addersgall', gainMs: 20_000, max: 3 };
const CARD: ToolPool = { name: 'Play II', gainMs: 60_000, max: 1 };
const CARD_III: ToolPool = { name: 'Play III', gainMs: 60_000, max: 1 };
const SUNTOUCHED: ToolPool = { name: 'Suntouched', gainMs: 120_000, max: 1 };
const SERAPH: ToolPool = { name: 'Seraph', gainMs: 60_000, max: 2 };
const TEMPERA: ToolPool = { name: 'Tempera Coat', gainMs: 90_000, max: 1 };
const LILY: ToolPool = { name: 'Lily', gainMs: 20_000, max: 3 };
const MINOR_ARCANA: ToolPool = { name: 'Minor Arcana', gainMs: 60_000, max: 1 };
export const POOLS: Record<number, ToolPool> = {
  16546: SERAPH, // Consolation
  16548: SERAPH, // Seraphic Veil
  34685: TEMPERA, // Tempera Coat
  34686: TEMPERA, // Tempera Grassa
  3542: OATH, // Sheltron
  25746: OATH, // Holy Sheltron
  7382: OATH, // Intervention
  188: AETHERFLOW, // Sacred Soil
  189: AETHERFLOW, // Lustrate
  3583: AETHERFLOW, // Indomitability
  7434: AETHERFLOW, // Excogitation
  24296: ADDERSGALL, // Druochole
  24298: ADDERSGALL, // Kerachole
  24299: ADDERSGALL, // Ixochole
  24303: ADDERSGALL, // Taurochole
  16531: LILY, // Afflatus Solace
  16534: LILY, // Afflatus Rapture
  7445: MINOR_ARCANA, // Lady of Crowns
  37027: CARD, // the Bole
  37025: CARD_III, // the Spire
  37028: CARD_III, // the Ewer
  37031: SUNTOUCHED, // Sun Sign
};

// Conditions the planner can take as met: it assumes everyone stands where
// the effect lands, and counts an effect's least (Improvised Finish at no
// stacks).
export const ASSUMED = (condition: string) => condition === 'behind the paladin' || condition.startsWith('up to ');

// The mitigations and shields each player of the pull has, at their level.
// A shield's HP comes from its caster's `power` (HP a potency heals) for
// one given in potency or as a share of a heal.
export function mitigationTools(
  players: TimelinePlayer[],
  catalog: ActionCatalog,
  power: Map<number, number> = new Map(),
): MitigationTool[] {
  const tools: MitigationTool[] = [];
  for (const player of players) {
    for (const action of playerActions(player, catalog)) {
      const effects = [...mitigationEffects(action), ...shieldEffects(action, player, power.get(player.id) ?? null)];
      if (!effects.length) continue;
      tools.push({
        player: player.id,
        action: action.id,
        name: action.name,
        recastMs: action.recastMs,
        charges: action.charges,
        gcd: action.gcd,
        group: `${player.id}:${action.cooldownGroup}`,
        pool: POOLS[action.id] ?? null,
        effects,
      });
    }
  }
  return tools;
}

// The catalog's actions a player has on their hotbar at their level.
export function playerActions(player: TimelinePlayer, catalog: ActionCatalog): CatalogAction[] {
  if (!player.job) return [];
  const job = player.job;
  const level = player.stats?.level ?? 100;
  const byId = new Map(catalog.actions.map((action) => [action.id, action]));
  return catalog.actions.filter((action) => {
    if (!action.jobs.includes(job) || action.level > level) return false;
    const upgrade = byId.get(REPLACED_BY[action.id]);
    return !upgrade || upgrade.level > level;
  });
}

const usable = (e: ActionEffect) => !!e.durationMs && (!e.condition || ASSUMED(e.condition));

function mitigationEffects(action: CatalogAction): MitigationEffect[] {
  return action.effects
    .filter((e) => e.kind === 'mitigation' && usable(e))
    .map((e) => {
      const status = e.status ?? action.name;
      return {
        target: e.target,
        // One percent for both, or each its own.
        physical: (e.percent ?? e.physical ?? 0) / 100,
        magic: (e.percent ?? e.magic ?? 0) / 100,
        shield: null,
        hits: 1,
        durationMs: e.durationMs as number,
        status,
        stack: SAME_STACK[status] ?? status,
      };
    })
    .filter((e) => e.physical > 0 || e.magic > 0);
}

// A shield's size: a potency (at its caster's power), a share of the heal
// the same action gives, or a share of max HP (the target's, or the
// caster's own). None when it can't be told (no heal power for the caster).
function shieldEffects(action: CatalogAction, player: TimelinePlayer, power: number | null): MitigationEffect[] {
  const heal = action.effects.find((e) => e.kind === 'heal' && e.potency && !e.condition);
  const effects: MitigationEffect[] = [];
  for (const e of action.effects) {
    if (e.kind !== 'shield' || !usable(e)) continue;
    let shield: MitigationEffect['shield'] = null;
    if (e.potency && power) shield = { hp: e.potency * power };
    else if (e.of === 'healed' && e.percent && heal?.potency && power)
      shield = { hp: (heal.potency * power * e.percent) / 100 };
    else if (e.of === 'maxHp' && e.percent) shield = { maxHpShare: e.percent / 100 };
    else if (e.of === 'casterMaxHp' && e.percent && player.maxHp) shield = { hp: (player.maxHp * e.percent) / 100 };
    if (!shield) continue;
    const status = e.status ?? action.name;
    effects.push({
      target: e.target,
      physical: 0,
      magic: 0,
      shield,
      hits: e.stacks ?? 1,
      durationMs: e.durationMs as number,
      status,
      stack: status,
    });
  }
  return effects;
}
