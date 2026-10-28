import { editChoices, keptInvulnerabilities } from './edits';
import { PlannerScheduler } from './planner-scheduler.service';
import { catalog, pull } from './scheduler-fixtures';

const SENTINEL = 17;
// What replaces Sentinel at level 92: the one the picker offers.
const GUARDIAN = 36920;
const RAMPART = 7531;
const SACRED_SOIL = 188;

describe("the user's edits to a plan", () => {
  const healed: [number, number, number, number][] = [[1, 2, 189, 60_000]];
  const timeline = () => pull([[60, 'Buster', 1, 120_000]], healed);
  const plan = (edits?: Parameters<PlannerScheduler['plan']>[2]['edits']) =>
    new PlannerScheduler().plan(timeline(), catalog(), { margin: 0.1, edits });
  const paladin = (p: ReturnType<typeof plan>) =>
    p.uses.filter((u) => u.player === 1 && !u.opener).map((u) => [u.name, u.at, !!u.edited]);

  it('keeps an added skill where the user put it, and plans the rest around it', () => {
    // Sentinel well before the buster, where the planner wouldn't.
    const p = plan({ added: [{ player: 1, action: SENTINEL, at: 20_000 }], removed: [] });

    expect(paladin(p)).toContainEqual(['Sentinel', 20_000, true]);
    // Its recast keeps the planner from another one for the buster.
    expect(paladin(p).filter(([name]) => name === 'Sentinel')).toHaveLength(1);
  });

  it("doesn't plan a removed skill where it was again, but may elsewhere", () => {
    const before = plan();
    const rampart = before.uses.find((u) => u.player === 1 && u.action === RAMPART);
    expect(rampart).toBeDefined();

    const after = plan({ added: [], removed: [{ player: 1, action: RAMPART, at: rampart!.at }] });

    expect(after.uses.some((u) => u.action === RAMPART && Math.abs(u.at - rampart!.at) < 1_500)).toBe(false);
  });

  it('offers the skills that fit at a moment, and says why the others don’t', () => {
    const p = plan({ added: [{ player: 1, action: GUARDIAN, at: 20_000 }], removed: [] });
    const choices = editChoices(p, timeline(), catalog(), 1, 40_000);
    const guardian = choices.find((c) => c.action === GUARDIAN);

    // Guardian's 120s recast from 20s.
    expect(guardian).toMatchObject({ ok: false, reason: 'Recast: back at 2:20' });
    expect(choices.filter((c) => c.ok).map((c) => c.name)).toContain('Divine Veil');
    // The fitting ones first.
    expect(choices.findIndex((c) => !c.ok)).toBeGreaterThan(choices.findIndex((c) => c.ok));
  });

  it("says when a skill's gauge is empty", () => {
    const p = plan();
    // The scholar's Aetherflow, spent by the user at the start: none left.
    p.uses.push(
      ...[1_000, 2_000, 3_000].map((at) => ({
        player: 2,
        action: SACRED_SOIL,
        name: 'Sacred Soil',
        at,
        target: null,
        covers: [],
        edited: true,
      })),
    );
    const soil = editChoices(p, timeline(), catalog(), 2, 5_000).find((c) => c.action === SACRED_SOIL);

    expect(soil?.ok).toBe(false);
    expect(soil?.reason).toMatch(/^(No Aetherflow until|Recast: back at)/);
  });

  it('stops forcing an invulnerability as played once the user removes it', () => {
    const hallowed = { player: 1, action: 30, mechanic: 0 };
    const mechanics = [{ id: 0, at: 65_000 }] as Parameters<typeof keptInvulnerabilities>[1];

    expect(keptInvulnerabilities([hallowed], mechanics, undefined)).toEqual([hallowed]);
    // Removed a few seconds before its mechanic: no longer kept there.
    expect(
      keptInvulnerabilities([hallowed], mechanics, { added: [], removed: [{ player: 1, action: 30, at: 62_000 }] }),
    ).toEqual([]);
    // Another skill, or one long before: still kept.
    expect(
      keptInvulnerabilities([hallowed], mechanics, { added: [], removed: [{ player: 1, action: 30, at: 10_000 }] }),
    ).toEqual([hallowed]);
  });

  it("lets the user's placement win over the planner's own: those give way", () => {
    const p = plan();
    const rampart = p.uses.find((u) => u.player === 1 && u.action === RAMPART);
    expect(rampart).toBeDefined();

    // 10s before the planner's Rampart, well within its 90s recast.
    const choice = editChoices(p, timeline(), catalog(), 1, rampart!.at - 10_000).find((c) => c.action === RAMPART);

    expect(choice?.ok).toBe(true);
  });
});
