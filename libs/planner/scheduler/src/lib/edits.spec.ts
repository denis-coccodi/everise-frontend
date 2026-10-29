import { editChoices, keptInvulnerabilities, withBans } from './edits';
import { PlannerScheduler } from './planner-scheduler.service';
import { action, catalog, pull } from './scheduler-fixtures';

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

  it('leaves out the edits of a player planned as they played', () => {
    const edits = { added: [{ player: 1, action: SENTINEL, at: 20_000 }], removed: [] };
    const asPlayed = new PlannerScheduler().plan(timeline(), catalog(), { margin: 0.1, edits, replan: [2] });

    expect(asPlayed.uses.some((u) => u.edited)).toBe(false);
  });

  it('says what an added skill covers, as the planner’s do', () => {
    // Sentinel (15s) 10s before the buster at 60s covers it; at 20s, nothing.
    const near = plan({ added: [{ player: 1, action: SENTINEL, at: 50_000 }], removed: [] });
    const far = plan({ added: [{ player: 1, action: SENTINEL, at: 20_000 }], removed: [] });
    const sentinel = (p: ReturnType<typeof plan>) => p.uses.find((u) => u.action === SENTINEL && u.edited);

    expect(sentinel(near)?.covers.map((id) => near.mechanics.find((m) => m.id === id)?.name)).toEqual(['Buster']);
    expect(sentinel(far)?.covers).toEqual([]);
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

  it('adds what a skill needs first with it, at the latest moment before it where that fits', () => {
    const deployment = action(3585, 'Deployment Tactics', ['SCH'], 90, []);
    const actions = { ...catalog(), actions: [...catalog().actions, deployment] };
    const t = timeline();
    // The scholar's Physicks (GCDs) every 2.5s from 30s.
    t.playerCasts.push(
      ...[30_000, 32_500, 35_000, 37_500].map((at) => ({ at, source: 2, target: 1, action: 190, castMs: 1_500 })),
    );
    const at = 37_500 + 1_500;
    const choice = (p: ReturnType<typeof plan>) => editChoices(p, t, actions, 2, at).find((c) => c.action === 3585);

    // No Adloquium before it: in place of the Physick at 37.5s, with it.
    expect(choice(plan())).toMatchObject({ ok: true, first: { action: 185, name: 'Adloquium', at: 37_500 } });
    // One already there: nothing to add.
    const adlo = { player: 2, action: 185, name: 'Adloquium', at: 35_000, target: 1, covers: [], edited: true };
    const p = plan();
    p.uses.push(adlo);
    expect(choice(p)).toMatchObject({ ok: true, first: null });
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

  // Two mechanics on the tank (1), 5s apart.
  const mechanics = [
    { id: 0, at: 65_000, hits: [{ player: 1 }] },
    { id: 1, at: 70_000, hits: [{ player: 1 }] },
  ] as Parameters<typeof keptInvulnerabilities>[1];
  const removedAt = (at: number) => ({ added: [], removed: [{ player: 1, action: 30, at }] });

  it('stops forcing an invulnerability as played on the mechanic the user took it off, and only that one', () => {
    const first = { player: 1, action: 30, mechanic: 0 };
    const second = { player: 1, action: 30, mechanic: 1 };

    expect(keptInvulnerabilities([first, second], mechanics, undefined)).toEqual([first, second]);
    // Removed 3s before the first: no longer forced there, still on the next.
    expect(keptInvulnerabilities([first, second], mechanics, removedAt(62_000))).toEqual([second]);
    // Removed long before either: both kept.
    expect(keptInvulnerabilities([first, second], mechanics, removedAt(10_000))).toEqual([first, second]);
  });

  it('keeps a removed invulnerability off the mechanic it saved, and only its slot otherwise', () => {
    const hallowed = { player: 1, action: 30, effects: [{ invulnerable: true }] };
    const [banned] = withBans([hallowed], removedAt(62_000), mechanics);

    expect(banned).toMatchObject({ notFor: [0], away: [{ from: 60_500, to: 63_500 }] });
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
