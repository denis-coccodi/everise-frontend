import type { PullTimeline } from '@everise/core/api-types';
import { withoutRepeatedDots } from './combined-dots';

describe('withoutRepeatedDots', () => {
  // A bleed (action 2) ticking on player 1, which FFLogs also logs as "Combined DoTs" (action 9).
  const hit = (action: number, at: number, amount: number, target = 1) =>
    ({
      at,
      action,
      amount,
      target,
      source: 5,
      tick: true,
      unmitigated: amount,
      hp: null,
    }) as unknown as PullTimeline['damage'][number];
  const timeline = (damage: PullTimeline['damage']) =>
    ({
      actions: [
        { id: 2, name: 'Bleeding' },
        { id: 9, name: 'Combined DoTs' },
      ],
      damage,
    }) as unknown as PullTimeline;

  it('drops a "Combined DoTs" tick that repeats the ticks logged at the same moment', () => {
    const damage = [hit(2, 126_600, 45_215), hit(9, 126_600, 45_215)];

    expect(withoutRepeatedDots(timeline(damage)).damage).toEqual([damage[0]]);
  });

  it('drops one that two ticks together add up to, give or take rounding', () => {
    const damage = [hit(2, 1_000, 300), hit(3, 1_020, 401), hit(9, 1_000, 700)];

    expect(withoutRepeatedDots(timeline(damage)).damage).toEqual(damage.slice(0, 2));
  });

  it("keeps one that is the only record of its damage, or another target's", () => {
    const damage = [hit(9, 1_000, 700), hit(2, 5_000, 300, 2), hit(9, 5_000, 300)];

    expect(withoutRepeatedDots(timeline(damage)).damage).toEqual(damage);
  });
});
