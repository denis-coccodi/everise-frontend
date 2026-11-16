import type { PullTimeline } from '@everise/core/api-types';
import type { HealTool } from './plan.model';
import { refillTargets, refillWorth, refillsBefore } from './heal-refill';

describe('refillWorth', () => {
  it('lets the healer with MP to spare refill with a GCD heal, none below the reserve', () => {
    expect(refillWorth(1)).toBe(1);
    expect(refillWorth(0.5)).toBe(0.5);
    expect(refillWorth(0.2)).toBe(0);
  });
});

describe('refillsBefore', () => {
  const tool = (cost: HealTool['cost'], pool: string | null = null, target = 'party') =>
    ({ cost, pool: pool && { name: pool, gainMs: 60_000, max: 3 }, effects: [{ target }] }) as HealTool;
  const may = refillsBefore(new Set([1]));

  it('refills with anything before a heavy mechanic, only with what costs no damage before the rest', () => {
    expect(may(1, tool('gcd'))).toBe(true);
    expect(may(2, tool('gcd'))).toBe(false);
    expect(may(2, tool('free'))).toBe(true);
    expect(may(2, tool('neutral'))).toBe(true);
  });

  it('keeps an Aetherflow stack (an Energy Drain) for the heavy mechanics, unlike the Faerie Gauge', () => {
    expect(may(1, tool('resource', 'Aetherflow'))).toBe(true);
    expect(may(2, tool('resource', 'Aetherflow'))).toBe(false);
    expect(may(2, tool('resource', 'Faerie Gauge'))).toBe(true);
    expect(refillsBefore(new Set(), true)(2, tool('resource', 'Aetherflow'))).toBe(true);
  });

  it('keeps a free heal on one member (Essential Dignity) for the heavy mechanics', () => {
    expect(may(1, tool('free', null, 'target'))).toBe(true);
    expect(may(2, tool('free', null, 'target'))).toBe(false);
    expect(may(2, tool('free', null, 'self'))).toBe(true);
  });

  it("never refills with a DPS's Second Wind, even everywhere", () => {
    expect(may(1, tool('self'))).toBe(false);
    expect(refillsBefore(new Set([1]), true)(1, tool('self'))).toBe(false);
  });
});

describe('refillTargets', () => {
  // Player 1 a tank, the rest DPS, each with 100,000 HP.
  const timeline = {
    players: [1, 2, 3, 4, 5].map((id) => ({ id, role: id === 1 ? 'tank' : 'melee', maxHp: 100_000 })),
  } as unknown as PullTimeline;
  const single = { effects: [{ target: 'target' }] } as HealTool;
  const party = { effects: [{ target: 'party' }] } as HealTool;

  it('leaves a heal on one member a tank, and anyone else missing a fifth of their HP or more', () => {
    const short = new Map([
      [1, 5_000],
      [2, 25_000],
      [3, 15_000],
    ]);
    expect([...refillTargets(short, single, timeline)]).toEqual([
      [1, 5_000],
      [2, 25_000],
    ]);
    expect(refillTargets(short, party, timeline)).toBe(short);
  });

  it('leaves it only the tanks once three or more of those are missing HP', () => {
    const short = new Map([
      [1, 30_000],
      [2, 25_000],
      [3, 40_000],
      [4, 5_000],
    ]);
    expect([...refillTargets(short, single, timeline)]).toEqual([[1, 30_000]]);
  });
});
