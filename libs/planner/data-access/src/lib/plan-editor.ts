import { computed, type Signal } from '@angular/core';
import { ActionCatalog, PullTimeline, TimelinePlayer } from '@everise/core/api-types';
import { editChoices, editSlots } from '@everise/planner/scheduler';
import type { EditItem } from './edit-list.model';
import type { PlanUseEntry } from './plan-log.model';
import type { PlanStore } from './plan.store';
import type { PlannerStore } from './planner.store';

// Editing the plan by hand, for the player whose tab is open: where a skill
// can go near a moment and which fit there, and each change (a skill
// added, on whoever the user picked when it goes on one; one taken out;
// one undone, or all of them), which plans the pull again.
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
    // The open player's edits, in time order, named.
    items: computed((): EditItem[] => {
      const [p, { pull, catalog }] = [player(), store];
      if (!p) return [];
      const actions = new Map(catalog.hasValue() ? catalog.value().actions.map((a) => [a.id, a]) : []);
      const names = new Map(pull.hasValue() ? pull.value().players.map((x) => [x.id, x.name]) : []);
      const { added, removed } = plans.edits();
      return [
        ...added.map((edit) => ({ kind: 'added' as const, edit })),
        ...removed.map((edit) => ({ kind: 'removed' as const, edit })),
      ]
        .filter(({ edit }) => edit.player === p.id)
        .sort((a, b) => a.edit.at - b.edit.at)
        .map(({ kind, edit }) => ({
          kind,
          edit,
          action: actions.get(edit.action)?.name ?? 'Unknown',
          icon: actions.get(edit.action)?.icon ?? null,
          target: kind === 'added' ? (names.get(edit.target ?? -1) ?? null) : null,
        }));
    }),
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
    // Who a single-target skill goes on until the user picks: the first
    // tank, where most of them go, or the player themself.
    defaultTarget: computed(() => {
      const players = store.pull.hasValue() ? store.pull.value().players : [];
      return players.find((x) => x.role === 'tank')?.id ?? player()?.id ?? null;
    }),
    add(skill: { at: number; action: number; target: number | null }) {
      const p = player();
      if (p) edit((id, t, c) => plans.addSkill(id, t, c, { ...skill, player: p.id, target: skill.target ?? p.id }));
    },
    remove(entry: PlanUseEntry) {
      const p = player();
      if (!p || !entry.id) return;
      const use = { player: p.id, action: entry.id, at: entry.at, edited: entry.edited };
      edit((id, t, c) => plans.removeSkill(id, t, c, use));
    },
    undo(item: EditItem) {
      edit((id, t, c) => plans.undoEdit(id, t, c, item.kind, item.edit));
    },
    reset() {
      edit((id, t, c) => plans.resetEdits(id, t, c));
    },
  };
}
