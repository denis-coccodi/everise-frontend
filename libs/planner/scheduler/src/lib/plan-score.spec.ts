import type { Plan } from './plan.model';
import { deadIn } from './plan-score';

describe('deadIn', () => {
  it('counts the players whose HP the plan runs out at some point, to any damage', () => {
    const plan = {
      hp: [
        {
          player: 1,
          points: [
            { at: 0, hp: 100 },
            { at: 5_000, hp: 0 },
            { at: 9_000, hp: 50 },
          ],
        },
        {
          player: 2,
          points: [
            { at: 0, hp: 100 },
            { at: 5_000, hp: 1 },
          ],
        },
        {
          player: 3,
          points: [
            { at: 0, hp: 100 },
            { at: 7_000, hp: -20 },
          ],
        },
      ],
    } as unknown as Plan;

    expect(deadIn(plan)).toBe(2);
  });
});
