import { TestBed } from '@angular/core/testing';
import { actionCatalog, pullTimeline } from './planner-fixtures';
import { PlanStore } from './plan.store';

describe('PlanStore', () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [PlanStore] });
    return TestBed.inject(PlanStore);
  }

  it('undoes one edit, keeping the others, and plans the pull again', async () => {
    const store = setup();
    const [timeline, catalog] = [pullTimeline(), actionCatalog()];
    const first = { player: 1, action: 7531, at: 20_000 };
    const second = { player: 1, action: 7535, at: 40_000 };
    await store.addSkill(1, timeline, catalog, first);
    await store.addSkill(1, timeline, catalog, second);
    await store.removeSkill(1, timeline, catalog, { player: 2, action: 185, at: 30_000 });

    await store.undoEdit(1, timeline, catalog, 'added', store.edits().added[0]);

    expect(store.edits()).toEqual({ added: [second], removed: [{ player: 2, action: 185, at: 30_000 }] });
    expect(store.plan()?.uses.some((u) => u.edited && u.at === 20_000)).toBe(false);
  });
});
