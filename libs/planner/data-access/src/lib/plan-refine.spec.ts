import type { Plan, Strategy } from '@everise/planner/scheduler';
import { refinePlans, refines } from './plan-refine';

// A plan with this many deaths to a mechanic and hits left short.
const planOf = (deaths: number, short = 0, label = '') =>
  ({
    label,
    uses: [],
    mechanics: [],
    unplaced: [],
    hp: [],
    hits: Array.from({ length: short }, () => ({ safe: false, avoidable: false })),
    deaths: Array.from({ length: deaths }, (_, i) => ({ player: i, mechanic: 1, at: 1000 })),
  }) as unknown as Plan;

const options = { margin: 0.1, maxHp: new Map<number, number>() };

async function refine(first: Plan, made: (strategy: Strategy, repair: boolean) => Plan) {
  const asked: string[] = [];
  const kept: string[] = [];
  let weighed = false;
  await refinePlans(
    { plan: first },
    async (strategy, repair = false) => {
      asked.push(JSON.stringify(strategy) + (repair ? ' repair' : ''));
      return { plan: made(strategy, repair) };
    },
    (best) => kept.push((best.plan as Plan & { label: string }).label),
    () => true,
    options,
    () => (weighed = true),
  );
  return { asked, kept, weighed };
}

describe('refinePlans', () => {
  it('tries every other strategy while players die to a mechanic, then mends the best way\x27s deaths', async () => {
    const { asked, kept, weighed } = await refine(planOf(3), (strategy, repair) =>
      repair ? planOf(0, 0, 'repaired') : strategy.healsFirstNeed ? planOf(1, 0, 'heals first') : planOf(4),
    );

    expect(asked).toEqual([
      '{"partyWaits":true}',
      '{"healsFirstNeed":true}',
      '{"tankChains":true}',
      '{"healersHeal":true}',
      '{"macrocosmos":true}',
      '{"healsFirstNeed":true} repair',
    ]);
    expect(kept).toEqual(['heals first', 'repaired']);
    expect(weighed).toBe(true);
  });

  it('tries only the party waiting and the healers healing where nobody dies but hits are short', async () => {
    const { asked, kept } = await refine(planOf(0, 2), (strategy) =>
      strategy.partyWaits ? planOf(0, 0, 'waits') : planOf(1),
    );

    // Asked for side by side; the first leaves nothing to mend, so none is repaired.
    expect(asked).toEqual(['{"partyWaits":true}', '{"healersHeal":true}']);
    expect(kept).toEqual(['waits']);
  });

  it('looks no further at a plan with nothing short and nobody dead', async () => {
    const { asked, weighed } = await refine(planOf(0), () => planOf(0));

    expect(asked).toEqual([]);
    expect(weighed).toBe(true);
    expect(refines(planOf(0))).toBe(false);
    expect(refines(planOf(0, 1))).toBe(true);
  });
});
