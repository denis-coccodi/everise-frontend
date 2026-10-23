import { ActionCatalog, ActionEffect, CatalogAction, TimelinePlayer } from '@everise/core/api-types';
import { Grant, Invulnerability, MitigationEffect, MitigationTool, ToolPool } from './plan.model';

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
// Astrologian's cards (Astral and Umbral Draw take turns every 55 seconds,
// each giving one of its own, so a card comes every 110), Suntouched (from Neutral
// Sect, every 120 seconds), Seraph (out every 120 seconds, with two
// Consolations), Tempera Coat (which Tempera Grassa uses up; back in 60
// to 120 seconds), the Lily gauge (one every 20 seconds, up to 3), Lady of
// Crowns (Umbral Draw's Minor Arcana, every 110 seconds) and Improvisation's finish (every 120
// seconds: Improvisation itself isn't planned). One a use, as the planner
// counts them.
const OATH: ToolPool = { name: 'Oath Gauge', gainMs: 25_000, max: 2 };
const AETHERFLOW: ToolPool = { name: 'Aetherflow', gainMs: 20_000, max: 3 };
const ADDERSGALL: ToolPool = { name: 'Addersgall', gainMs: 20_000, max: 3 };
const card = (name: string): ToolPool => ({ name, gainMs: 110_000, max: 1 });
const SUNTOUCHED: ToolPool = { name: 'Suntouched', gainMs: 120_000, max: 1 };
const SERAPH: ToolPool = { name: 'Seraph', gainMs: 60_000, max: 2 };
const TEMPERA: ToolPool = { name: 'Tempera Coat', gainMs: 90_000, max: 1 };
const LILY: ToolPool = { name: 'Lily', gainMs: 20_000, max: 3 };
const IMPROVISATION: ToolPool = { name: 'Improvisation', gainMs: 120_000, max: 1 };
export const POOLS: Record<number, ToolPool> = {
  25789: IMPROVISATION, // Improvised Finish
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
  7445: card('Lady of Crowns'),
  37027: card('the Bole'),
  37025: card('the Spire'),
  37028: card('the Ewer'),
  37031: SUNTOUCHED, // Sun Sign
  37024: card('the Arrow'),
};

// Actions another grants, by action, as the game has them: the catalog
// gives them a recast of their own (a second or so), which isn't what limits
// them. The plan uses one only after it has the action that grants it.
const SERAPHISM = { action: 37014, withinMs: 20_000, uses: Infinity };
export const GRANTED: Record<number, Grant> = {
  37011: { action: 16536, withinMs: 30_000, uses: 1 }, // Divine Caress, after Temperance
  37015: SERAPHISM, // Manifestation
  37016: SERAPHISM, // Accession
  36944: { action: 7394, withinMs: 30_000, uses: 1 }, // Earth's Reply, after Riddle of Earth
  3585: { action: 185, withinMs: 30_000, uses: 1 }, // Deployment Tactics, on an Adloquium's Galvanize
};

// Shields an action copies from another's to the whole party, by action:
// Deployment Tactics, an Adloquium's Galvanize (for what's left of it; the
// plan has it go up as the Adloquium lands).
const SPREADS: Record<number, number> = { 3585: 185 };
// Recitation makes the next of these heals critical (Adloquium, Concitation,
// Indomitability, Excogitation): a shield the size of the heal grows with it,
// and Adloquium adds Catalyze.
export const RECITATION = 16542;
export const RECITED = [185, 37013, 3583, 7434];
// A shield's condition that holds when its heal is critical.
const CRITICAL = 'critical heal';
// Haima's and Panhaima's barrier: a new one as each breaks, one a stack, so a
// shield of its size on each of that many hits.
const RENEWED = 'renewed each time it breaks';

// What a critical heal heals, from the healer's critical hit at level 100
// (the multiplier's base 1.4, a thousandth more every 13.9 points over 420);
// 1.5 when the log doesn't say.
export function criticalTimes(player: TimelinePlayer) {
  const critical = player.stats?.criticalHit;
  if (!critical) return 1.5;
  return 1.4 + Math.floor((200 * (critical - 420)) / 2780) / 1000;
}

// The tanks' invulnerabilities, by action: the catalog says only that
// attacks can't kill.
const INVULNERABLE: Record<number, Invulnerability> = {
  30: 'immune', // Hallowed Ground
  43: 'lastHp', // Holmgang
  16152: 'halvesHp', // Superbolide
  3638: 'walkingDead', // Living Dead
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
  const byId = new Map(catalog.actions.map((action) => [action.id, action]));
  for (const player of players) {
    for (const action of playerActions(player, catalog)) {
      const own = power.get(player.id) ?? null;
      const from = byId.get(SPREADS[action.id]);
      const spread = action.effects.find((e) => e.kind === 'shield')?.status;
      // Its shields, as a critical heal's too (`times`).
      const shields = (times = 0) =>
        from
          ? shieldEffects(from, player, own, times)
              .filter((e) => e.status === spread)
              .map((e) => ({ ...e, target: 'party' as const }))
          : shieldEffects(action, player, own, times);
      const others = [...mitigationEffects(action), ...invulnerableEffects(action, own)];
      const effects = [...others, ...shields()];
      const recitation = action.id === RECITATION;
      if (!effects.length && !recitation) continue;
      const recited = RECITED.includes(from?.id ?? action.id);
      tools.push({
        player: player.id,
        action: action.id,
        name: action.name,
        recastMs: action.recastMs,
        charges: action.charges,
        gcd: action.gcd,
        castMs: action.castMs,
        group: `${player.id}:${action.cooldownGroup}`,
        pool: POOLS[action.id] ?? null,
        grantedBy: GRANTED[action.id] ?? null,
        effects,
        ...(recitation ? { critical: criticalTimes(player) } : {}),
        ...(recited ? { whenCritical: [...others, ...shields(criticalTimes(player))] } : {}),
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
        invulnerable: null,
      };
    })
    .filter((e) => e.physical > 0 || e.magic > 0);
}

// Living Dead heals its user 1,500 potency with each GCD while it and
// Walking Dead last.
const LIVING_DEAD_POTENCY = 1500;

// An invulnerability's effect, for those the planner knows (above); its
// condition is what it does, which the table says.
function invulnerableEffects(action: CatalogAction, power: number | null): MitigationEffect[] {
  const invulnerable = INVULNERABLE[action.id];
  const e = action.effects.find((o) => o.kind === 'invulnerable' && o.durationMs);
  if (!invulnerable || !e) return [];
  const status = e.status ?? action.name;
  return [
    {
      target: 'self',
      physical: 0,
      magic: 0,
      shield: null,
      hits: 1,
      durationMs: e.durationMs as number,
      status,
      stack: status,
      invulnerable,
      ...(invulnerable === 'walkingDead' && power ? { selfHeal: LIVING_DEAD_POTENCY * power } : {}),
    },
  ];
}

// A shield's size: a potency (at its caster's power), a share of the heal
// the same action gives, or a share of max HP (the target's, or the
// caster's own). None when it can't be told (no heal power for the caster).
// As a critical heal's (`critical`: what the heal is multiplied by), one
// the size of the heal is that much bigger, and those that need the heal to
// be critical (Catalyze) count.
function shieldEffects(
  action: CatalogAction,
  player: TimelinePlayer,
  power: number | null,
  critical = 0,
): MitigationEffect[] {
  const heal = action.effects.find((e) => e.kind === 'heal' && e.potency && !e.condition);
  const effects: MitigationEffect[] = [];
  for (const e of action.effects) {
    if (e.kind !== 'shield') continue;
    const holds = e.condition === RENEWED || (critical && e.condition === CRITICAL);
    if (!usable(e) && !(e.durationMs && holds)) continue;
    let shield: MitigationEffect['shield'] = null;
    if (e.potency && power) shield = { hp: e.potency * power };
    else if (e.of === 'healed' && e.percent && heal?.potency && power)
      shield = { hp: (heal.potency * power * e.percent * (critical || 1)) / 100 };
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
      invulnerable: null,
    });
  }
  return effects;
}
