import type { Plan, PlanOptions } from '@everise/planner/scheduler';
import { plannedSideBySide } from './plan-side-by-side';

// A plan this many hits short, named after the options it was made with.
const planOf = (short: number, made: PlanOptions) =>
  ({
    made,
    deaths: [],
    hits: Array.from({ length: short }, () => ({ safe: false, avoidable: false })),
    hp: [],
  }) as unknown as Plan & { made: PlanOptions };

const kind = (o: PlanOptions) =>
  (o.noRaidwideShields === 'light' ? 'L' : '') +
    (o.refillEverywhere ? 'R' : '') +
    (o.noRaidwideShields === true ? 'N' : '') || 'plain';

const better = (a: Plan, b: Plan) => a.hits.length < b.hits.length;

async function sideBySide(shortBy: Record<string, number>) {
  const asked: string[] = [];
  const stopped: string[] = [];
  const plan = (await plannedSideBySide(
    { margin: 0.1 },
    (o, _progress, signal) => {
      asked.push(kind(o) + (o.oneWay ? '' : '!'));
      signal.addEventListener('abort', () => stopped.push(kind(o)));
      return Promise.resolve(planOf(shortBy[kind(o)], o));
    },
    better,
  )) as Plan & { made: PlanOptions };
  return { asked, stopped, kept: kind(plan.made) };
}

describe('plannedSideBySide', () => {
  it('asks for every way at once, each alone, and keeps the plan the planner would (`planVariants`)', async () => {
    // Nothing short: the plain one; each better: the last; one worse: the one before it.
    for (const [shortBy, kept] of [
      [{ plain: 0, L: 0, R: 0, N: 0, RN: 0 }, 'plain'],
      [{ plain: 4, L: 3, R: 2, N: 1, RN: 0 }, 'RN'],
      [{ plain: 4, L: 5, R: 0, N: 0, RN: 0 }, 'plain'],
      [{ plain: 4, L: 2, R: 3, N: 0, RN: 0 }, 'L'],
    ] as const) {
      const made = await sideBySide(shortBy);
      expect(made.asked).toEqual(['plain', 'L', 'R', 'N', 'RN']);
      expect(made.kept).toBe(kept);
    }
  });

  it('stops the ways still being made once the plan is picked', async () => {
    const made = await sideBySide({ plain: 0, L: 0, R: 0, N: 0, RN: 0 });
    expect(made.kept).toBe('plain');
    expect(made.stopped).toEqual(['plain', 'L', 'R', 'N', 'RN']);
  });
});
