import { TestBed } from '@angular/core/testing';
import { actionCatalog, pullTimeline } from './planner-fixtures';
import { PlanStore } from './plan.store';

// Each test plans the pull (the scheduler loads on the first): slower than most.
describe('PlanStore', { timeout: 20_000 }, () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [PlanStore] });
    return TestBed.inject(PlanStore);
  }

  it('says when planning again gave the same plan', async () => {
    const store = setup();
    const [timeline, catalog] = [pullTimeline(), actionCatalog()];
    await store.run(1, timeline, catalog);
    expect(store.sameAsBefore()).toBe(false);
    await store.run(1, timeline, catalog);
    expect(store.sameAsBefore()).toBe(true);
  });
  it('keeps edits made before the pull is planned (a reload), without planning it', async () => {
    const store = setup();
    await store.addSkill(1, pullTimeline(), actionCatalog(), { player: 1, action: 7531, at: 20_000 });
    expect(store.edits().added).toHaveLength(1);
    expect(store.plan()).toBeNull();
  });
  it('adds a skill and what it needs first together, in one plan', async () => {
    const store = setup();
    const first = { player: 2, action: 185, at: 37_500, target: 1 };
    const skill = { player: 2, action: 3585, at: 39_000, target: 1 };

    await store.addSkill(1, pullTimeline(), actionCatalog(), first, skill);

    expect(store.edits().added).toEqual([first, skill]);
  });

  it('warns of what the edits leave short against the plan without them, not the step before', async () => {
    const store = setup();
    const [timeline, catalog] = [pullTimeline(), actionCatalog()];
    await store.run(1, timeline, catalog);
    const original = store.plan();
    const rampart = original?.uses.find((u) => u.action === 7531);
    expect(rampart).toBeDefined();

    // Out of its place: compared with the original plan.
    await store.removeSkill(1, timeline, catalog, { player: rampart!.player, action: 7531, at: rampart!.at });
    expect(store.basePlan()).toBe(original);
    const removedOnly = store.editWarning();
    // Then elsewhere: still against the original, which isn't planned again.
    await store.addSkill(1, timeline, catalog, { player: rampart!.player, action: 7531, at: 5_000 });
    expect(store.basePlan()).toBe(original);
    expect(typeof removedOnly).toBe('string');
    // All undone: nothing to warn of.
    await store.resetEdits(1, timeline, catalog);
    expect(store.editWarning()).toBe('');
  });

  it('undoes one edit, keeping the others, and plans the pull again', async () => {
    const store = setup();
    const [timeline, catalog] = [pullTimeline(), actionCatalog()];
    await store.run(1, timeline, catalog);
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
