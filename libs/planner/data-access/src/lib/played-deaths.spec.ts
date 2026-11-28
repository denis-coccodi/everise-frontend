import type { PullTimeline, TimelineHit } from '@everise/core/api-types';
import { actionCatalog } from './planner-fixtures';
import { playedDeaths } from './played-deaths';

// Attacks: a light-party stack shared by everyone, a puddle, a raidwide.
const STACK = 900;
const PUDDLE = 901;
const RAIDWIDE = 902;
const VULNERABILITY = 1789;
const REPRISAL = 1193;
const MAX_HP = 200_000;

const hit = (at: number, target: number, action: number, extra: Partial<TimelineHit> = {}): TimelineHit => ({
  at,
  target,
  source: 13,
  action,
  amount: 60_000,
  unmitigated: 80_000,
  mitigated: 20_000,
  absorbed: 0,
  overkill: 0,
  multiplier: 0.75,
  damageType: 'magic',
  tick: false,
  statuses: [],
  hp: 140_000,
  ...extra,
});

// Eight players (1-2 tanks, 3-4 healers, 5-8 DPS) and a raidwide on
// everyone at 10s, 20s and 30s, Reprisal up for the first two.
function timeline(extra: Partial<PullTimeline> = {}): PullTimeline {
  const party = [1, 2, 3, 4, 5, 6, 7, 8];
  const role = (id: number) => (id <= 2 ? 'tank' : id <= 4 ? 'healer' : 'dps');
  const raidwides = [10_000, 20_000, 30_000].flatMap((at) => party.map((p) => hit(at, p, RAIDWIDE)));
  return {
    code: 'aBcD1234eFgH5678',
    pullId: 3,
    startedAt: '2026-10-20T19:03:00.000Z',
    durationMs: 120_000,
    players: party.map((id) => ({
      id,
      name: `Player ${id}`,
      job: role(id) === 'tank' ? 'PLD' : role(id) === 'healer' ? 'WHM' : 'NIN',
      role: role(id),
      maxHp: MAX_HP,
      maxMp: null,
      mp: [],
      stats: null,
    })),
    enemies: [
      { id: -1, name: 'Environment', boss: false },
      { id: 13, name: 'Boss', boss: true },
    ],
    actions: [
      { id: STACK, name: 'Twin Stack' },
      { id: PUDDLE, name: 'Puddle' },
      { id: RAIDWIDE, name: 'Big Raidwide' },
    ],
    statuses: [
      { id: VULNERABILITY, name: 'Vulnerability Up' },
      { id: REPRISAL, name: 'Reprisal' },
    ],
    damage: raidwides,
    heals: [],
    absorbs: [],
    playerCasts: [],
    enemyCasts: [],
    auras: [
      { status: REPRISAL, source: 1, target: 13, from: 9_000, to: 21_000, stacks: null, shield: null },
      { status: REPRISAL, source: 1, target: 13, from: 29_000, to: 31_000, stacks: null, shield: null },
    ],
    deaths: [],
    phases: [],
    downtime: [],
    limitBreakGauge: [],
    ...extra,
  };
}

const deathsOf = (t: PullTimeline) => playedDeaths(t, actionCatalog());

describe('playedDeaths', () => {
  it('lists nothing when nobody died', () => {
    expect(deathsOf(timeline())).toEqual([]);
  });

  it('blames the players who skipped a stack, not the ones in it who died', () => {
    const base = timeline();
    const everyone = [1, 2, 3, 4, 5, 6, 7, 8].map((p) => hit(40_000, p, STACK));
    // At 60s, 7 and 8 skip it: 5 and 6 take their share and die.
    const short = [1, 2, 3, 4].map((p) => hit(60_000, p, STACK));
    const dying = [5, 6].map((p) => hit(60_000, p, STACK, { amount: 260_000, unmitigated: 300_000, overkill: 60_000 }));
    const deaths = deathsOf({
      ...base,
      damage: [...base.damage, ...everyone, ...short, ...dying],
      deaths: [5, 6].map((player) => ({ at: 61_000, player, action: STACK, source: 13 })),
    });
    expect(deaths.map((d) => [d.player, d.cause, d.blame])).toEqual([
      [5, 'missedShare', [7, 8]],
      [6, 'missedShare', [7, 8]],
    ]);
    expect(deaths[0].reason).toBe(
      "Twin Stack is shared by the whole party, but Player 7 (NIN) and Player 8 (NIN) weren't in it, so the 6 in it took more.",
    );
  });

  it('blames a player who failed a mechanic themselves', () => {
    const base = timeline();
    const puddles = [3, 4, 5, 6].map((p) => hit(50_000 + p * 5_000, p, PUDDLE, { unmitigated: 50_000 }));
    const failed = hit(90_000, 7, PUDDLE, { unmitigated: 700_000, amount: 700_000, overkill: 560_000 });
    const [death] = deathsOf({
      ...base,
      damage: [...base.damage, ...puddles, failed],
      deaths: [{ at: 91_000, player: 7, action: PUDDLE, source: 13 }],
    });
    expect([death.cause, death.blame, death.killedBy]).toEqual(['failed', [7], 'Puddle']);
  });

  it('blames an earlier mistake whose Vulnerability Up made a normal hit lethal', () => {
    const base = timeline();
    const mistake = hit(25_000, 5, PUDDLE, { unmitigated: 30_000 });
    const lethal = base.damage.map((h) =>
      h.at === 30_000 && h.target === 5 ? { ...h, amount: 140_000, overkill: 0, statuses: [VULNERABILITY] } : h,
    );
    const [death] = deathsOf({
      ...base,
      damage: [...lethal, mistake, hit(26_000, 6, PUDDLE, { unmitigated: 30_000 })],
      auras: [
        ...base.auras,
        { status: VULNERABILITY, source: 13, target: 5, from: 25_000, to: 45_000, stacks: 1, shield: null },
      ],
      deaths: [{ at: 31_000, player: 5, action: RAIDWIDE, source: 13 }],
    });
    expect([death.cause, death.blame]).toEqual(['earlierMistake', [5]]);
    expect(death.reason).toContain('Vulnerability Up they got from Puddle at 0:25');
  });

  it('blames whoever usually puts up the mitigation that was missing', () => {
    const base = timeline({ auras: timeline().auras.slice(0, 1) });
    const [death] = deathsOf({
      ...base,
      // The raidwide at 30s, without its usual Reprisal (up for 10s and 20s).
      deaths: [{ at: 31_000, player: 8, action: RAIDWIDE, source: 13 }],
    });
    expect([death.cause, death.blame]).toEqual(['shortfall', [1]]);
    expect(death.reason).toBe(
      "A normal hit of Big Raidwide, but Reprisal wasn't up, as it usually is (from Player 1 (PLD)).",
    );
  });

  it('blames the healers when a normal hit lands on a player low on HP', () => {
    const base = timeline();
    const low = base.damage.map((h) =>
      h.at === 20_000 && h.target === 6 ? { ...h, amount: 60_000, overkill: 20_000 } : h,
    );
    const [death] = deathsOf({
      ...base,
      damage: low,
      deaths: [{ at: 21_000, player: 6, action: RAIDWIDE, source: 13 }],
    });
    expect([death.cause, death.blame]).toEqual(['shortfall', [3, 4]]);
    expect(death.reason).toBe('They were at 30% HP when Big Raidwide hit: not healed up in time.');
  });

  it("names a tower's usual partner when one soaked it alone", () => {
    const base = timeline();
    // Towers for two: 5 with 6 and 7 with 8, every time, until 6 skips one.
    const towers = [40_000, 50_000, 60_000].flatMap((at) => [
      hit(at, 5, PUDDLE, { unmitigated: 50_000 }),
      hit(at, 6, PUDDLE, { unmitigated: 50_000 }),
      hit(at + 3_000, 7, PUDDLE, { unmitigated: 50_000 }),
      hit(at + 3_000, 8, PUDDLE, { unmitigated: 50_000 }),
    ]);
    const alone = hit(70_000, 5, PUDDLE, { unmitigated: 100_000, amount: 100_000, overkill: 20_000 });
    const [death] = deathsOf({
      ...base,
      damage: [...base.damage, ...towers, alone],
      deaths: [{ at: 71_000, player: 5, action: PUDDLE, source: 13 }],
    });
    expect([death.cause, death.blame]).toEqual(['missedShare', [6]]);
    expect(death.reason).toBe(
      'Puddle is taken by 2, but only Player 5 (NIN) was in it, so they took more. Player 6 (NIN) usually takes it with them.',
    );
  });

  it('blames deaths in a wipe already under way like the one that started it', () => {
    const base = timeline();
    const puddles = [3, 4, 5, 6].map((p) => hit(50_000 + p * 5_000, p, PUDDLE, { unmitigated: 50_000 }));
    const failed = hit(90_000, 7, PUDDLE, { unmitigated: 700_000, amount: 700_000, overkill: 560_000 });
    const after = [1, 2, 3, 4].map((p, i) =>
      hit(92_000 + i * 1_000, p, RAIDWIDE, { amount: 50_000, overkill: 10_000 }),
    );
    const deaths = deathsOf({
      ...base,
      damage: [...base.damage, ...puddles, failed, ...after],
      deaths: [
        { at: 91_000, player: 7, action: PUDDLE, source: 13 },
        ...[1, 2, 3, 4].map((player, i) => ({ at: 92_500 + i * 1_000, player, action: RAIDWIDE, source: 13 })),
      ],
    });
    expect(deaths.at(-1)).toMatchObject({ player: 4, cause: 'cascade', blame: [7] });
  });

  it("says when the log doesn't tell what killed them", () => {
    const [fall, unknown] = deathsOf(
      timeline({
        deaths: [
          { at: 5_000, player: 5, action: null, source: -1 },
          { at: 6_000, player: 6, action: null, source: null },
        ],
      }),
    );
    expect([fall.cause, fall.reason]).toEqual([
      'unknown',
      'Killed by the environment (a fall, or the floor): the log says no more.',
    ]);
    expect([unknown.cause, unknown.blame]).toEqual(['unknown', []]);
  });
});
