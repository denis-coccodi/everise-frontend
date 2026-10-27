import type { OpenerId } from './openers.model';
// What the scheduler plans from and what it answers. Times are ms from the
// pull's start.

export interface PlanOptions {
  // The HP each hit must leave, as a share of max HP (0.1: 10%).
  margin: number;
  // The players whose actions are planned (ids); everyone else's
  // mitigations, heals and invulnerabilities stay as they played them.
  // Left out, everyone's are planned.
  replan?: number[];
  // The tanks' invulnerabilities the plan must use where they say; left
  // out, those of the pull, where they were used (`playedInvulnerabilities`).
  // Any other the plan uses only where nothing else saves a hit.
  invulnerabilities?: InvulnerabilityChoice[];
  // What each replanned player favours, by id: damage (the default) or
  // healing (`Favour`).
  favour?: Record<number, Favour>;
  // The opener each replanned player starts with, by id, for the jobs that
  // have them (`OPENERS`); left out, the standard one.
  openers?: Record<number, OpenerId>;
}

// Favouring damage, a healer spends what would overcap on damage (a white
// mage's third lily, for Afflatus Misery) and keeps GCD heals for where
// nothing else will do; favouring healing, they don't, and GCD heals cost
// less.
export type Favour = 'dps' | 'healing';

// An invulnerability on a mechanic, as a group's strategy has it (one tank
// taking a mechanic the two would trade, or standing where it makes the
// mechanic simpler); `mechanic` null: never this one.
export interface InvulnerabilityChoice {
  player: number;
  action: number;
  mechanic: number | null;
}

// What there is to choose from for the tanks' invulnerabilities: each
// tank's, the mechanics that hit each player, and where the pull had them.
export interface InvulnerabilityOptions {
  tools: { player: number; action: number; name: string }[];
  mechanics: { id: number; at: number; name: string; players: number[] }[];
  played: InvulnerabilityChoice[];
}

// One player's part of a mechanic.
export interface MechanicHit {
  player: number;
  // The damage before any mitigation or shield.
  unmitigated: number;
  // What they took in the pull, after what was up then.
  asPlayed: number;
  // A failed mechanic (an unsoaked tower, a missed stack): many times what
  // the attack does to everyone else, and more than the player's HP. The
  // plan takes it as avoided.
  avoidable: boolean;
}

export type DamageType = 'physical' | 'magic' | 'unique';

// One boss attack landing on one or more players at once: a raidwide, a tank
// buster, or something aimed at a few.
export interface Mechanic {
  id: number;
  at: number;
  action: number;
  name: string;
  kind: 'raidwide' | 'tankbuster' | 'targeted';
  // Which share of a mitigation counts: physical or magic, none on unique
  // damage; null when the log doesn't say.
  damageType: DamageType | null;
  hits: MechanicHit[];
}

// A mitigation or shield a player can use: an action and what it lowers or
// absorbs, for whom.
export interface MitigationTool {
  // When it can't be used: a fairy's order while Dissipation has her away.
  away?: { from: number; to: number }[];
  player: number;
  action: number;
  name: string;
  recastMs: number;
  charges: number;
  // A weaponskill or spell: it costs a GCD the player would deal damage
  // with, so the plan uses it only where nothing else will do.
  gcd: boolean;
  // Its cast bar (0 for an instant one): it takes that much of the GCD.
  castMs: number;
  // Actions of one player in the same group share their recast.
  group: string;
  // What it spends besides its recast, when that's what really limits it
  // (a gauge, a card, a buff another action grants).
  pool: ToolPool | null;
  // For an action another grants, which and how; null for any other.
  grantedBy: Grant | null;
  effects: MitigationEffect[];
  // Recitation: what the next of its user's heals it makes critical is
  // multiplied by.
  critical?: number;
  // Its effects as a critical heal (Adloquium after Recitation: a bigger
  // Galvanize, and Catalyze), and Deployment Tactics spreading that.
  whenCritical?: MitigationEffect[];
}

// A player's resource some actions spend one of: it fills one every
// `gainMs`, up to `max`, and starts full (a white mage's lilies too, since
// 7.4).
export interface ToolPool {
  name: string;
  gainMs: number;
  max: number;
  // A pool that fills only at these moments, to `max` (Aetherflow and
  // Dissipation's stacks), from empty: `gainMs` is then how often it comes.
  refills?: number[];
}

// An action another grants: usable only after a use of that one, up to
// `uses` times in the `withinMs` after it (Divine Caress: once in the 30s
// after Temperance; Accession, as often as it fits in Seraphism's 20s).
export interface Grant {
  action: number;
  withinMs: number;
  uses: number;
}

export interface MitigationEffect {
  // `target`: the user or one party member, picked per use.
  target: 'self' | 'target' | 'party' | 'enemies';
  // The share of physical and of magic damage it takes off (0.1: 10%; 0
  // for a shield). None of unique damage.
  physical: number;
  magic: number;
  // What a shield absorbs after mitigation; null for a mitigation.
  shield: ShieldSize | null;
  // How many hits on a player a shield absorbs: it breaks on the first (as
  // the planner counts it), and one renewed each time it breaks (Haima)
  // lasts more.
  hits: number;
  durationMs: number;
  // The status, as the game names it.
  status: string;
  // Effects with one key don't stack: two Reprisals count once, and so do
  // Troubadour and Tactician.
  stack: string;
  // A tank's invulnerability; null for anything else.
  invulnerable: Invulnerability | null;
  // The HP each of its user's GCDs heals them while it and Walking Dead
  // last (Living Dead's 1,500 potency); left out for anything else.
  selfHeal?: number;
}

// What a tank's invulnerability does to the hits while it lasts: nothing
// at all (`immune`: Hallowed Ground); they land but can't take the last HP
// (`lastHp`: Holmgang); nothing, once it has taken half the tank's max HP
// off as it's used (`halvesHp`: Superbolide, since 7.1; down to 1 HP
// before); they land but can't take the last HP, and the tank must be
// healed by their max HP in the 10s after the first, or die
// (`walkingDead`: Living Dead).
export type Invulnerability = 'immune' | 'lastHp' | 'halvesHp' | 'walkingDead';

// A set amount of HP, or a share of the max HP of whoever gets it.
export type ShieldSize = { hp: number } | { maxHpShare: number };

// An action that restores HP: a healer's heal, or the heal a mitigation
// also gives (Kerachole's regen, Shake It Off's heal).
export interface HealTool {
  // When it can't be used: a fairy's order while Dissipation has her away.
  away?: { from: number; to: number }[];
  player: number;
  action: number;
  name: string;
  recastMs: number;
  charges: number;
  gcd: boolean;
  // The cast bar's length: it heals that long after it's used.
  castMs: number;
  group: string;
  pool: ToolPool | null;
  grantedBy: Grant | null;
  // What using it costs the healer (`HealCost`).
  cost: HealCost;
  effects: HealEffect[];
  // Null for a heal that lands as it's cast.
  delayed: DelayedHeal | null;
}

// What a heal costs, as the healers' guides rank them: nothing (an oGCD,
// Addersgall's included: it refills, so spend it freely); a little (an
// oGCD spending Aetherflow, which Energy Drain would otherwise turn into
// damage); a GCD that deals or gives back its damage (Afflatus Solace and
// Rapture, refunded by Afflatus Misery; Pneuma); a GCD of damage (any other
// GCD heal).
export type HealCost = 'free' | 'resource' | 'neutral' | 'gcd';

// An oGCD that only pays with one of its user's heals after it: Plenary
// Indulgence before a Medica, Cure III or Afflatus Rapture (its Confession
// heals each member the heal reaches), Zoe before a Sage's GCD heal (50%
// more), Neutral Sect before an Aspected Benefic or Helios Conjunction (20%
// more), Krasis on the member a Sage's heal is for (20% more). The plan
// uses it only with one.
export interface HealPairing {
  player: number;
  action: number;
  name: string;
  recastMs: number;
  charges: number;
  group: string;
  // The heals it goes with, and how long before one it can go up.
  heals: number[];
  withinMs: number;
  // What the heal's healing is multiplied by (on the member it's put on
  // only, with `onTarget`: Krasis), and the HP each member it reaches gets
  // on top.
  times: number;
  onTarget: boolean;
  // Its own healing comes with it (Physis II's regen).
  own: boolean;
  extra: ShieldSize | null;
  // The barrier it leaves on whoever each heal reaches, as a share of what
  // the heal heals them, by heal (Neutral Sect's: 250% for an Aspected
  // Benefic), for 30s.
  barriers: Record<number, number>;
}

// A heal that lands later than it's used: Earthly Star's, once the star has
// grown (10s, set off with Stellar Detonation) or on its own (20s);
// Excogitation's, when its target drops to half their HP, or when it ends;
// Haima's, for the stacks left when it ends; Macrocosmos's, when it ends.
export interface DelayedHeal {
  // The delays it can be planned with, the one that needs nothing more
  // first; a triggered heal's is when it ends.
  delaysMs: number[];
  // What sets it off sooner than the first; null when nothing does.
  release: { action: number; name: string } | null;
  // The share of max HP at or below which it goes off at once, before its
  // delay runs out (Excogitation: 0.5); null when it waits for it.
  belowShare: number | null;
  // The share of the damage each player took meanwhile that it heals on top
  // (Macrocosmos: 0.5); null when none.
  damageShare: number | null;
  // Its heal is for each stack left when it ends; null when it has none.
  stacks: HealStacks | null;
  // Its heal's name in the log, an action's or a status's.
  loggedAs: string;
}

// Stacks the hits use up: Haima's and Panhaima's (one a hit on whoever has
// the barrier), Liturgy of the Bell's (one a hit on the white mage, healing
// the party then).
export interface HealStacks {
  count: number;
  // Whose hits use them up: the use's target, each member of the party for
  // themselves, or its user.
  holder: 'self' | 'target' | 'party';
  // What a stack used up heals the party; null when it heals nothing then.
  perHit: ShieldSize | null;
}

// A heal, or healing over time: `ticks` heals of `size`, every 3 seconds
// from 3 seconds after it lands.
export interface HealEffect {
  target: 'self' | 'target' | 'party';
  size: ShieldSize;
  ticks: number;
  // The healing over time's status (its ticks name it in the log).
  status: string | null;
  statusId: number | null;
}

// When a player should use an action, and the mechanics it covers (or,
// for a heal, the mechanic it heals them up for).
export interface PlannedUse {
  player: number;
  action: number;
  name: string;
  at: number;
  // The party member a `target` effect goes on.
  target: number | null;
  covers: number[];
  // A damage action the plan places for no hit (Afflatus Misery, when the
  // Blood Lily is in full bloom).
  damage?: boolean;
  // A heal Recitation makes critical, or Deployment Tactics spreading one.
  critical?: boolean;
  // A lily spent because the lilies are full (favouring damage), so none
  // goes to waste and the Blood Lily charges the next Misery.
  overcap?: boolean;
  // A step of the player's opener (an Energy Drain, Chain Stratagem...),
  // shown with the plan.
  opener?: boolean;
}

// A hit as the plan leaves it.
export interface PlannedHit {
  mechanic: number;
  player: number;
  unmitigated: number;
  planned: number;
  asPlayed: number;
  // What shields absorbed of it, after mitigation.
  absorbed: number;
  // Their HP when it lands, with the plan's heals; null when the pull
  // doesn't say their max HP.
  hpBefore: number | null;
  // The planned damage as a share of their max HP; null when the pull
  // doesn't say their max HP.
  share: number | null;
  // Whether it leaves at least the margin of their HP, or can't kill them
  // (an invulnerability is up), or is avoided (a failed mechanic, taking
  // nothing in the plan).
  safe: boolean;
  invulnerable: boolean;
  avoidable: boolean;
  // The mitigations and shields the plan has up for it.
  covers: string[];
}

export interface Plan {
  mechanics: Mechanic[];
  uses: PlannedUse[];
  hits: PlannedHit[];
  // The invulnerabilities asked for that the plan couldn't use there: one
  // the tank doesn't have, or that its recast doesn't allow.
  unplaced: InvulnerabilityChoice[];
  // Each player's HP over the pull with the plan; none before the heals
  // are planned.
  hp: PlannedHp[];
}

// A player's HP with the plan: what it is after each moment something
// changes it, in time order.
export interface PlannedHp {
  player: number;
  points: { at: number; hp: number }[];
}
