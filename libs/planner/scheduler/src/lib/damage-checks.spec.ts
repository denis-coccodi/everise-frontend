import type { PullTimeline } from '@everise/core/api-types';
import { coveredMechanics, damageChecks, FIRST_DAMAGE_CHECK } from './damage-checks';

describe('damageChecks', () => {
  // Player 1 (100,000 HP): a bleed (2) ticking every 3 s, then an auto-attack (3) burst; a buster (4) is a mechanic.
  const hit = (at: number, action: number, amount: number, tick = false) =>
    ({
      at,
      action,
      amount,
      target: 1,
      source: 9,
      tick,
      unmitigated: amount,
      hp: null,
    }) as unknown as PullTimeline['damage'][number];
  const timeline = (damage: PullTimeline['damage']) =>
    ({
      actions: [
        { id: 2, name: 'Bleeding' },
        { id: 3, name: 'Attack' },
        { id: 4, name: 'Buster' },
      ],
      damage,
    }) as unknown as PullTimeline;
  const maxHp = new Map([[1, 100_000]]);

  it('makes a burst of ticks or auto-attacks one check at its first hit, taking all of it', () => {
    const checks = damageChecks(
      timeline([
        hit(10_000, 2, 20_000, true),
        hit(13_000, 2, 20_000, true),
        hit(16_000, 2, 20_000, true),
        hit(30_000, 3, 8_000),
        hit(32_000, 3, 8_000),
      ]),
      maxHp,
    );

    expect(checks.map((c) => [c.at, c.name, c.hits[0].unmitigated])).toEqual([
      [10_000, 'Bleeding', 60_000],
      [30_000, 'Attack', 16_000],
    ]);
    expect(checks[0].id).toBe(FIRST_DAMAGE_CHECK);
  });

  it("leaves mechanics' hits to the mechanics, and bursts too small to need a heal", () => {
    expect(damageChecks(timeline([hit(10_000, 4, 90_000), hit(20_000, 3, 4_000)]), maxHp)).toEqual([]);
  });

  it('cuts a burst after 10 s, so heals go in during a long one', () => {
    const ticks = [0, 3, 6, 9, 12].map((s) => hit(s * 1_000, 2, 10_000, true));

    expect(damageChecks(timeline(ticks), maxHp).map((c) => c.at)).toEqual([0, 12_000]);
  });

  it("drops damage checks from what a heal covers, and names a Walking Dead check's trigger", () => {
    const dead = { check: { id: -1 }, trigger: { id: 7 } } as never;

    expect(coveredMechanics([3, FIRST_DAMAGE_CHECK, -1], [dead])).toEqual([3, 7]);
  });
});
