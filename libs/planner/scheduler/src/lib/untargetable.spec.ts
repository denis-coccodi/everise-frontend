import type { PullTimeline } from '@everise/core/api-types';
import { untargetable, withTargetsGone } from './untargetable';

describe('untargetable', () => {
  const pull = (casts: { at: number; target: number | null }[]) =>
    ({
      players: [{ id: 1 }, { id: 2 }],
      downtime: [
        { from: 0, to: 30_000 },
        { from: 100_000, to: 130_000 },
      ],
      playerCasts: casts.map((c) => ({ ...c, source: 1, action: 9, castMs: null })),
    }) as unknown as PullTimeline;

  it("is the pull's downtime, but where players cast at an enemy all the same", () => {
    // An attack on enemy 11 at 10s: something could be targeted then. A heal on player 2 at 110s isn't one.
    expect(
      untargetable(
        pull([
          { at: 10_000, target: 11 },
          { at: 110_000, target: 2 },
        ]),
      ),
    ).toEqual([{ from: 100_000, to: 130_000 }]);
  });

  it('keeps the tools with an effect on enemies away then, and only those', () => {
    const reprisal = { name: 'Reprisal', effects: [{ target: 'enemies' }] };
    const rampart = { name: 'Rampart', effects: [{ target: 'self' }], away: [{ from: 5, to: 6 }] };
    const [r, ramp] = withTargetsGone(pull([]), [reprisal, rampart]);

    expect(r.away).toEqual([
      { from: 0, to: 30_000 },
      { from: 100_000, to: 130_000 },
    ]);
    expect(ramp).toBe(rampart);
  });
});
