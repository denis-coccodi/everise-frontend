import { Schemas } from './schemas';

// The fight planner: an FFLogs report, one of its pulls as it happened,
// and the jobs' actions with their heals and mitigations.

// Whether the site has an FFLogs client, so the planner can be used.
export type PlannerAvailable = Schemas['PlannerAvailableResponse'];

// An FFLogs report's players and its Extreme, Savage and Ultimate pulls.
export type FightReport = Schemas['FightReportResponse'];
export type ReportPull = FightReport['pulls'][number];
export type ReportPlayer = FightReport['players'][number];
export type PullKind = ReportPull['kind'];
export type PlayerRole = NonNullable<ReportPlayer['role']>;

// Everything that happened in one pull; times are ms from its start.
export type PullTimeline = Schemas['PullTimelineResponse'];
export type PlannerClears = Schemas['PlannerClearsResponse'];
export type TimelinePlayer = PullTimeline['players'][number];
export type TimelineEnemy = PullTimeline['enemies'][number];
export type TimelineHit = PullTimeline['damage'][number];
export type TimelineHeal = PullTimeline['heals'][number];
export type TimelineAbsorb = PullTimeline['absorbs'][number];
export type TimelineCast = PullTimeline['playerCasts'][number];
export type TimelineAura = PullTimeline['auras'][number];
export type TimelineDeath = PullTimeline['deaths'][number];
export type TimelineName = PullTimeline['actions'][number];

// The jobs' actions: how each is used, and what its heals and mitigations do.
export type ActionCatalog = Schemas['ActionCatalogResponse'];
export type CatalogAction = ActionCatalog['actions'][number];
export type ActionEffect = CatalogAction['effects'][number];
export type EffectKind = ActionEffect['kind'];
