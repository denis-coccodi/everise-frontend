import { CatalogAction } from '@everise/core/api-types';
import type { PlannedUse } from '@everise/planner/scheduler';
import { withCombosKept } from './plan-combos';
import type { PlanUseEntry } from './plan-log.model';

const gcd = (id: number, name: string, description: string): CatalogAction => ({
  id,
  name,
  icon: null,
  description,
  jobs: ['DRK'],
  level: 1,
  gcd: true,
  castMs: 0,
  recastMs: 2_500,
  charges: 1,
  mpCost: 0,
  cooldownGroup: 58,
  range: 3,
  radius: 0,
  effects: [],
  traits: [],
});
const actions = [
  gcd(3617, 'Hard Slash', 'Delivers an attack with a potency of 300.'),
  gcd(3623, 'Syphon Strike', 'Combo Action: Hard Slash\nCombo Potency: 380'),
  gcd(3632, 'Souleater', 'Combo Action: Syphon Strike\nCombo Bonus: Increases Blood Gauge by 20'),
  gcd(36928, 'Scarlet Delirium', 'Can only be executed while under the effect of Delirium.'),
  gcd(7392, 'Bloodspiller', 'Blood Gauge Cost: 50'),
];
const byId = new Map(actions.map((a) => [a.id, a]));
const [hardSlash] = actions;
const entry = (at: number, action: string, instead?: string): PlanUseEntry => ({
  kind: 'use',
  at,
  action,
  target: null,
  covers: [],
  damage: false,
  overcap: false,
  gcd: true,
  ...(instead ? { instead } : {}),
});
const planned = (at: number, action: number): PlannedUse => ({
  player: 1,
  action,
  name: '',
  at,
  target: null,
  covers: [],
});
const names = (entries: PlanUseEntry[]) => entries.map((e) => e.action);

describe('withCombosKept', () => {
  it('makes a stand-in the next step of the combo it comes in, not its first step', () => {
    const entries = [
      entry(0, 'Hard Slash'),
      entry(2_500, 'Syphon Strike'),
      entry(5_000, 'Hard Slash', 'Bloodspiller'),
      entry(7_500, 'Hard Slash', 'Bloodspiller'),
    ];
    expect(names(withCombosKept(entries, [], [], byId, hardSlash))).toEqual([
      'Hard Slash',
      'Syphon Strike',
      'Souleater',
      'Hard Slash',
    ]);
  });

  it("goes on through the plan's own GCDs of another combo, and starts again once the combo has run out", () => {
    const entries = [
      entry(0, 'Hard Slash'),
      entry(5_000, 'Hard Slash', 'Bloodspiller'),
      entry(60_000, 'Hard Slash', 'Bloodspiller'),
    ];
    const kept = withCombosKept(entries, [planned(2_500, 36928)], [], byId, hardSlash);
    expect(names(kept)).toEqual(['Hard Slash', 'Syphon Strike', 'Hard Slash']);
    expect(kept[1]).toMatchObject({
      instead: 'Bloodspiller',
      description: 'Combo Action: Hard Slash\nCombo Potency: 380',
    });
  });

  it('leaves the stand-ins as they are without a usual attack', () => {
    const entries = [entry(0, 'Hard Slash'), entry(2_500, 'Hard Slash', 'Bloodspiller')];
    expect(withCombosKept(entries, [], [], byId, undefined)).toBe(entries);
  });
});
