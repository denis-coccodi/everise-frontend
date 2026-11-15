import type { InvulnerabilityOptions, OpenerId, Plan, PlanEdits, ReferencedTimeline } from '@everise/planner/scheduler';
import { NO_EDITS } from './plan-edits';

// A player in the plan's options: who they are in the report, and their id
// in the pull.
export interface PlanPlayer {
  id: number;
  name: string;
  server: string | null;
}

// What the plan does with a failed mechanic: covers it like any other hit,
// as far as anything saves the player, or takes it as avoided.
export type FailedMechanics = 'cover' | 'ignore';

// The HP margin a plan starts with (percent of max HP), and the range a
// person may set.
export const DEFAULT_MARGIN = 10;
export const MARGIN_RANGE = { min: 0, max: 50 };

// The fight planner's plan for the pull open, and its options (`PlanStore`).
export interface PlanState {
  // The HP each hit must leave, in percent of max HP.
  margin: number;
  // Failed mechanics: covered like any other hit, or taken as avoided.
  failedMechanics: FailedMechanics;
  // For the pull open: the players to replan (ids).
  preparedFor: number | null;
  players: PlanPlayer[];
  replan: number[];
  // A replanned astrologian's other Lightspeed charge, by id: as played
  // (left out) or planned.
  lightspeed: Record<number, 'logged' | 'replan'>;
  // The opener each player starts with, the standard one (left out) or
  // another (`OPENERS`), by id.
  openers: Record<number, OpenerId>;
  invulnerabilityOptions: InvulnerabilityOptions | null;
  // The user's edits to the pull's plan, the key they're remembered by, and
  // the hits they leave short that the plan without them doesn't.
  edits: PlanEdits;
  editsKey: string;
  editWarning: string;
  // The plan without the edits, and the options it was made with, to
  // compare against (made again only when those change).
  basePlan: Plan | null;
  baseKey: string;
  // The last plan, the pull and timeline it's for, and whether planning again changed nothing.
  plan: Plan | null;
  timeline: ReferencedTimeline | null;
  sameAsBefore: boolean;
  pullId: number | null;
  planning: boolean;
  // Shown, and looking for a better plan made another way (`refinePlans`).
  improving: boolean;
  // How far the plans being made (planning, or improving) have got together, 0 to 1.
  progress: number;
  error: string;
}

export const INITIAL_PLAN_STATE: PlanState = {
  margin: DEFAULT_MARGIN,
  failedMechanics: 'cover',
  preparedFor: null,
  players: [],
  replan: [],
  lightspeed: {},
  openers: {},
  invulnerabilityOptions: null,
  edits: NO_EDITS,
  editsKey: '',
  editWarning: '',
  basePlan: null,
  baseKey: '',
  plan: null,
  timeline: null,
  sameAsBefore: false,
  pullId: null,
  planning: false,
  improving: false,
  progress: 0,
  error: '',
};
