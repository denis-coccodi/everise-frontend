import { computed, type Signal } from '@angular/core';
import { ActionCatalog, PullTimeline, TimelinePlayer } from '@everise/core/api-types';
import { editChoices, editSlots } from '@everise/planner/scheduler';
import type { PlanUseEntry } from './plan-log.model';
import type { PlanStore } from './plan.store';
import type { PlannerStore } from './planner.store';

// Editing the plan by hand, for the player whose tab is open: where a skill
// can go near a moment and which fit there, and each change (a skill
// added on themselves when it goes on one, one taken out, all undone),
// which plans the pull again.
export function planEditor(
  store: InstanceType<typeof PlannerStore>,
  plans: InstanceType<typeof PlanStore>,
  player: Signal<TimelinePlayer | null>,
) {
  const edit = (change: (pullId: number, timeline: PullTimeline, catalog: ActionCatalog) => Promise<void>) => {
    const { pull, catalog, pullId } = store;
    const id = pullId();
    if (id && pull.hasValue() && catalog.hasValue()) void change(id, pull.value(), catalog.value());
  };
  return {
    count: computed(() => plans.edits().added.length + plans.edits().removed.length),
    slotsFor: computed(() => {
      const [p, { pull, catalog }] = [player(), store];
      if (!p || !pull.hasValue() || !catalog.hasValue()) return () => [];
      const [timeline, actions] = [pull.value(), catalog.value()];
      return (at: number) => editSlots(timeline, actions, p.id, at);
    }),
    choicesFor: computed(() => {
      const [p, plan, { pull, catalog }] = [player(), plans.plan(), store];
      if (!p || !plan || !pull.hasValue() || !catalog.hasValue()) return () => [];
      const [timeline, actions] = [pull.value(), catalog.value()];
      return (at: number) => editChoices(plan, timeline, actions, p.id, at);
    }),
    add(skill: { at: number; action: number }) {
      const p = player();
      if (p) edit((id, t, c) => plans.addSkill(id, t, c, { ...skill, player: p.id, target: p.id }));
    },
    remove(entry: PlanUseEntry) {
      const p = player();
      if (!p || !entry.id) return;
      const use = { player: p.id, action: entry.id, at: entry.at, edited: entry.edited };
      edit((id, t, c) => plans.removeSkill(id, t, c, use));
    },
    reset() {
      edit((id, t, c) => plans.resetEdits(id, t, c));
    },
  };
}
