import { action, catalog, pull } from './scheduler-fixtures';
import { stingsAtPull, stingsFrom, unpaidToxikons, type StingCast } from './addersting';

// A sage (2) and a tank (1); the tank takes 30,000 at 10s and 20,000 at 20s, the sage 5,000 at 15s.
const timeline = () => {
  const t = pull([]);
  t.damage = [
    [10_000, 1, 30_000],
    [15_000, 2, 5_000],
    [20_000, 1, 20_000],
  ].map(([at, target, amount]) => ({
    at,
    target,
    source: 99,
    action: 1,
    damageType: 'magic' as const,
    amount,
    unmitigated: null,
    mitigated: 0,
    absorbed: 0,
    overkill: 0,
    multiplier: 1,
    tick: false,
    statuses: [],
    hp: 100_000,
  })) as typeof t.damage;
  return t;
};
const cat = () => {
  const c = catalog();
  const shield = (percent: number, target: 'target' | 'party') => ({
    kind: 'shield' as const,
    target,
    status: null,
    statusId: null,
    percent,
    physical: null,
    magic: null,
    potency: null,
    of: 'healed' as const,
    durationMs: 30_000,
    stacks: null,
    condition: null,
  });
  const heal = (potency: number, target: 'target' | 'party') => ({
    ...shield(0, target),
    kind: 'heal' as const,
    percent: null,
    potency,
    of: null,
    durationMs: null,
  });
  c.actions.push(
    action(24291, 'Eukrasian Diagnosis', ['SGE'], 1.5, [heal(300, 'target'), shield(180, 'target')]),
    action(37034, 'Eukrasian Prognosis II', ['SGE'], 1.5, [heal(100, 'party'), shield(360, 'party')]),
  );
  return c;
};
const cast = (action: number, at: number, target: number | null = null): StingCast => ({
  action,
  at,
  target,
  own: true,
});

describe('stingsFrom', () => {
  // 50 HP a potency: Eukrasian Diagnosis a 27,000 barrier, Prognosis II 18,000.
  it("gives a stack when a Eukrasian Diagnosis's barrier is absorbed, on anyone", () => {
    expect(stingsFrom(timeline(), cat(), 2, 50, [cast(24291, 5_000, 1)])).toEqual([10_000]);
  });

  it("gives none for a Prognosis on anyone but the sage, nor for a barrier that isn't all taken", () => {
    // The sage takes 5,000 of their own 18,000: none.
    expect(stingsFrom(timeline(), cat(), 2, 50, [cast(37034, 5_000)])).toEqual([]);
  });
});

describe('unpaidToxikons', () => {
  const toxikon = (at: number): StingCast => ({ action: 24316, at, target: null, own: false });

  it('pays each Toxikon from a stack, up to three held', () => {
    const toxikons = [toxikon(1_000), toxikon(2_000), toxikon(12_000)];
    // One stack at the pull, one at 10s: the second Toxikon has none.
    expect([...unpaidToxikons(toxikons, [10_000], 1)].map((t) => t.at)).toEqual([2_000]);
    expect(stingsAtPull(toxikons, [10_000])).toBe(2);
  });
});
