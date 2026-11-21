import { action, catalog, pull } from './scheduler-fixtures';
import { followUpUses } from './burst-follow-ups';
import type { PlannedUse } from './plan.model';
import { Weaving } from './weaving';

// A player (2) of `job` casting an instant GCD every 2.5s from 0.5s to the end of a 100s pull, `own` in place of
// some (by time).
const timeline = (job: string, own: Record<number, number> = {}) => {
  const t = pull([]);
  t.durationMs = 100_000;
  t.players = [{ id: 2, name: 'Their Name', job, role: 'tank', maxHp: 100_000, maxMp: null, mp: [], stats: null }];
  t.playerCasts = Array.from({ length: 40 }, (_, i) => 500 + i * 2500).map((at) => ({
    at,
    source: 2,
    target: null,
    action: own[at] ?? 9,
    castMs: null,
  }));
  return t;
};
const cat = () => {
  const c = catalog();
  c.actions.push(
    action(9, 'Hard Slash', ['DRK', 'SCH', 'GNB'], 2.5, [], { gcd: true }),
    action(7436, 'Chain Stratagem', ['SCH'], 120, []),
    action(37012, 'Baneful Impaction', ['SCH'], 1, []),
    action(7390, 'Delirium', ['DRK'], 60, []),
    action(36928, 'Scarlet Delirium', ['DRK'], 2.5, [], { gcd: true }),
    action(36929, 'Comeuppance', ['DRK'], 2.5, [], { gcd: true }),
    action(36930, 'Torcleaver', ['DRK'], 2.5, [], { gcd: true }),
    action(36931, 'Impalement', ['DRK'], 2.5, [], { gcd: true }),
    action(16164, 'Bloodfest', ['GNB'], 60, []),
    action(36937, 'Reign of Beasts', ['GNB'], 2.5, [], { gcd: true }),
    action(36938, 'Noble Blood', ['GNB'], 2.5, [], { gcd: true }),
    action(36939, 'Lion Heart', ['GNB'], 2.5, [], { gcd: true }),
  );
  return c;
};
const buff = (action: number, at: number): PlannedUse => ({
  player: 2,
  action,
  name: '',
  at,
  target: null,
  covers: [],
  burst: true,
});
const follow = (t: ReturnType<typeof timeline>, planned: PlannedUse[]) => {
  const c = cat();
  return followUpUses(
    t,
    c,
    t.players,
    Weaving.of(t, c, () => true),
    planned,
  ).map((u) => [u.name, u.at]);
};

describe('followUpUses', () => {
  it("has a scholar's Baneful Impaction in the first weave slot after each of the plan's Chain Stratagems", () => {
    // Chain Stratagem after the GCD at 50.5s; the next slot is its second weave.
    expect(follow(timeline('SCH'), [buff(7436, 51_100)])).toEqual([['Baneful Impaction', 51_800]]);
  });

  it("keeps the Delirium combo where they played it, if it's in the plan's Delirium", () => {
    // Delirium at 51.1s; they played the combo in its 15s (53s, 55.5s, 58s).
    const t = timeline('DRK', { 53_000: 36928, 55_500: 36929, 58_000: 36930 });

    expect(follow(t, [buff(7390, 51_100)])).toEqual([
      ['Scarlet Delirium', 53_000],
      ['Comeuppance', 55_500],
      ['Torcleaver', 58_000],
    ]);
  });

  it("places it at their next GCDs where their own came before the plan's Delirium", () => {
    // They played it after their Delirium at 21.1s; the plan's is at 51.1s.
    const t = timeline('DRK', { 23_000: 36928, 25_500: 36929, 28_000: 36930 });

    expect(follow(t, [buff(7390, 51_100)])).toEqual([
      ['Scarlet Delirium', 53_000],
      ['Comeuppance', 55_500],
      ['Torcleaver', 58_000],
    ]);
  });

  it("doesn't keep theirs where the plan put a GCD of its own", () => {
    // Their Scarlet Delirium at 53s, where the plan has a GCD: it goes in their next.
    const t = timeline('DRK', { 53_000: 36928 });
    const planned = [buff(7390, 51_100), { ...buff(9, 53_000), burst: false }];

    expect(follow(t, planned)).toEqual([
      ['Scarlet Delirium', 55_500],
      ['Comeuppance', 58_000],
      ['Torcleaver', 60_500],
    ]);
  });

  it('counts Impalement for any of the three', () => {
    const t = timeline('DRK', { 53_000: 36931, 55_500: 36931 });

    expect(follow(t, [buff(7390, 51_100)])).toEqual([
      ['Impalement', 53_000],
      ['Impalement', 55_500],
      ['Torcleaver', 58_000],
    ]);
  });

  it('leaves the GCDs the plan already uses, and ends a combo with no slot left in time', () => {
    // Bloodfest at 91.1s; the plan's GCDs at 93s and 95.5s; the pull's last GCD at 98s.
    const planned = [buff(16164, 91_100), { ...buff(9, 93_000), burst: false }, { ...buff(9, 95_500), burst: false }];

    expect(follow(timeline('GNB'), planned)).toEqual([['Reign of Beasts', 98_000]]);
  });
});
