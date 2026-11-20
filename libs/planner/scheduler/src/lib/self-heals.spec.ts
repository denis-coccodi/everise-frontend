import type { ActionEffect, CatalogAction } from '@everise/core/api-types';
import { delayedEvents } from './delayed-heals';
import { HpTrack } from './hp-track';
import type { HealTool, PlannedUse } from './plan.model';
import { conditionalOn, maxHpHeal } from './self-heals';

const effect = (values: Partial<ActionEffect>) =>
  ({
    kind: 'heal',
    target: 'self',
    status: null,
    potency: 400,
    percent: null,
    durationMs: null,
    condition: null,
    ...values,
  }) as ActionEffect;
const action = (effects: ActionEffect[]) => ({ id: 1, name: 'Test', effects }) as unknown as CatalogAction;

describe('conditionalOn', () => {
  it("reads Bloodwhetting's heal as one with each weaponskill while its mitigation lasts", () => {
    const heal = effect({ condition: 'each weaponskill' });
    const blood = action([effect({ kind: 'mitigation', durationMs: 8000 }), heal]);

    expect(conditionalOn(blood, heal)).toEqual({ each: 'gcd', withinMs: 8000, orAtEnd: false });
    expect(conditionalOn(blood, effect({ condition: "each of the warrior's weaponskills" }))?.each).toBe('gcd');
  });

  it("reads Tengentsu's regen as one once hit in its 4s, and Damnation's as one once hit or as it ends", () => {
    const foresight = effect({ kind: 'regen', condition: 'when hit', durationMs: 9000 });
    const tengentsu = action([
      effect({ kind: 'mitigation', condition: 'next attack', durationMs: 4000 }),
      effect({ kind: 'mitigation', condition: 'when hit', durationMs: 9000 }),
      foresight,
    ]);
    const impulse = effect({ kind: 'regen', condition: 'when hit or when Damnation ends', durationMs: 15_000 });
    const damnation = action([effect({ kind: 'mitigation', durationMs: 15_000 }), impulse]);

    expect(conditionalOn(tengentsu, foresight)).toEqual({ each: 'hit', withinMs: 4000, orAtEnd: false });
    expect(conditionalOn(damnation, impulse)).toEqual({ each: 'hit', withinMs: 15_000, orAtEnd: true });
    expect(conditionalOn(damnation, effect({}))).toBeUndefined();
  });
});

describe('maxHpHeal', () => {
  it('heals by as much as it raises max HP (Great Nebula, Thrill of Battle)', () => {
    expect(maxHpHeal(effect({ kind: 'maxHp', percent: 20 }))).toMatchObject({ size: { maxHpShare: 0.2 }, ticks: 1 });
    expect(maxHpHeal(effect({ kind: 'mitigation', percent: 20 }))).toBeNull();
  });
});

describe('delayedEvents with conditional heals', () => {
  const tool = (on: NonNullable<HealTool['effects'][number]['on']>, ticks = 1, status: string | null = null) =>
    ({
      player: 1,
      action: 1,
      name: 'Test',
      castMs: 0,
      delayed: null,
      effects: [{ target: 'self', size: { hp: 10_000 }, ticks, status, statusId: null, on }],
    }) as unknown as HealTool;
  const use: PlannedUse = { player: 1, action: 1, name: 'Test', at: 10_000, target: null, covers: [] };
  const maxHp = new Map([[1, 100_000]]);
  const events = (t: HealTool, hits: number[], gcds: number[]) =>
    delayedEvents(
      t,
      use,
      0,
      [1],
      maxHp,
      new HpTrack(maxHp, []),
      (_p, from, to) => hits.filter((at) => at > from && at <= to),
      (_p, from, to) => gcds.filter((at) => at >= from && at <= to),
    ).map((e) => e.at);

  it('heals with each of its GCDs in the window (Bloodwhetting)', () => {
    // Used at 10s for 8s: the GCDs at 11s, 13.5s and 16s, not those at 9s or 18.5s.
    const blood = tool({ each: 'gcd', withinMs: 8000, orAtEnd: false });
    expect(events(blood, [], [9000, 11_000, 13_500, 16_000, 18_500])).toEqual([11_000, 13_500, 16_000]);
  });

  it('heals over time from the first hit in the window, or as it ends where it says so, else not at all', () => {
    const foresight = tool({ each: 'hit', withinMs: 4000, orAtEnd: false }, 3, "Tengentsu's Foresight");
    expect(events(foresight, [12_000, 13_000], [])).toEqual([15_000, 18_000, 21_000]);
    expect(events(foresight, [20_000], [])).toEqual([]);
    const impulse = tool({ each: 'hit', withinMs: 15_000, orAtEnd: true }, 2, 'Primeval Impulse');
    expect(events(impulse, [], [])).toEqual([28_000, 31_000]);
  });
});
