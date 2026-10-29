import type { PlanEdit } from '@everise/planner/scheduler';

// One of the user's edits to the open player's plan, for the list that
// undoes them one at a time: "Removed Rampart at 1:02.3".
export interface EditItem {
  kind: 'added' | 'removed';
  edit: PlanEdit;
  action: string;
  icon: number | null;
  // Who an added skill goes on, when it goes on one.
  target: string | null;
}
