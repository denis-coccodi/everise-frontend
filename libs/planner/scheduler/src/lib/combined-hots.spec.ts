import type { PullTimeline } from '@everise/core/api-types';
import { combinedShares } from './combined-hots';
import { pull } from './scheduler-fixtures';

const COMBINED = 500;
const [MEDICA, REGEN] = [101, 102];

type Heal = PullTimeline['heals'][number];
const tick = (at: number, status: number | null, amount: number, action: number | null = null): Heal => ({
  at,
  source: 2,
  pet: null,
  target: 1,
  action,
  status,
  amount,
  overheal: 0,
  tick: true,
  estimated: false,
  hp: null,
});
const aura = (status: number, from: number, to: number) => ({
  status,
  source: 2,
  target: 1,
  from,
  to,
  stacks: null,
  shield: null,
});

// The healer (2)'s Medica ticks 300 and Regen 100 on the tank (1); then a
// merged tick of both.
function timeline(auras: ReturnType<typeof aura>[]): PullTimeline {
  return {
    ...pull([]),
    actions: [{ id: COMBINED, name: 'Combined HoTs' }],
    heals: [tick(3_000, MEDICA, 300), tick(3_000, REGEN, 100), tick(6_000, null, 400, COMBINED)],
    auras,
  };
}
const merged = (t: PullTimeline) => t.heals[2];

describe('combinedShares', () => {
  it('keeps the share of a merged tick whose heals over time the plan leaves as played', () => {
    const t = timeline([aura(MEDICA, 0, 15_000), aura(REGEN, 0, 18_000)]);

    // The plan replaces Medica: Regen's 100 of each 400 stays.
    expect(combinedShares(t, (_, s) => s === MEDICA).get(merged(t))).toBe(0.25);
    expect(combinedShares(t, () => true).get(merged(t))).toBe(0);
    expect(combinedShares(t, () => false).get(merged(t))).toBe(1);
  });

  it('splits only between the heals over time on the target then', () => {
    // Regen alone was on: the plan replacing Medica leaves the tick whole.
    const t = timeline([aura(REGEN, 0, 18_000)]);

    expect(combinedShares(t, (_, s) => s === MEDICA).get(merged(t))).toBe(1);
  });

  it("splits by all the caster's healing over time where none was seen on the target", () => {
    const t = timeline([]);

    expect(combinedShares(t, (_, s) => s === MEDICA).get(merged(t))).toBe(0.25);
  });
});
