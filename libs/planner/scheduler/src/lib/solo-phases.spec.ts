import type { PullTimeline } from '@everise/core/api-types';
import { reaches } from './coverage';
import { healEvents } from './hp-events';
import type { HealTool, Mechanic, MitigationTool, PlannedUse } from './plan.model';
import { pull } from './scheduler-fixtures';
import { reachable, soloPhases, withSoloPhases } from './solo-phases';

type Heal = PullTimeline['heals'][number];
const healOf = (at: number, source: number, target: number): Heal => ({
  at: at * 1000,
  source,
  pet: null,
  target,
  action: 3594,
  status: null,
  amount: 10_000,
  overheal: 0,
  tick: false,
  estimated: false,
  hp: null,
});

// The paladin (1), the scholar (2) and the bard (3): the scholar heals everyone at 100s and 160s; between, the boss is
// gone (98–162s), the scholar is hit six times by their own add and heals themselves `selfHeals` times.
function soloPull(selfHeals = 2, downtime = [{ from: 98_000, to: 162_000 }]): PullTimeline {
  const hits = Array.from({ length: 6 }, (_, i): [number, string, number, number] => [110 + i * 5, 'Grasp', 2, 20_000]);
  const timeline = pull(hits);
  const party = (at: number) => [1, 3].map((target) => healOf(at, 2, target));
  const own = Array.from({ length: selfHeals }, (_, i) => healOf(120 + i * 10, 2, 2));
  return { ...timeline, heals: [...party(100), ...own, ...party(160)], downtime };
}

describe('soloPhases', () => {
  it('finds a stretch in downtime where nothing reaches anyone else, yet players are hit and heal themselves', () => {
    expect(soloPhases(soloPull())).toEqual([{ from: 100_000, to: 160_000 }]);
  });

  it('leaves out a cutscene: nothing on others, but the healers heal no one', () => {
    expect(soloPhases(soloPull(1))).toEqual([]);
  });

  it('leaves out a stretch while the boss is up', () => {
    expect(soloPhases(soloPull(2, []))).toEqual([]);
  });
});

describe('reachable', () => {
  const alone = [{ from: 100_000, to: 160_000 }];

  it('lets a use made in a solo phase reach only its user', () => {
    expect(reachable(alone, 2, 120_000, 2)).toBe(true);
    expect(reachable(alone, 2, 120_000, 1)).toBe(false);
  });

  it('lets one made before it reach everyone, as it did (a regen already up)', () => {
    expect(reachable(alone, 2, 90_000, 1)).toBe(true);
    expect(reachable(undefined, 2, 120_000, 1)).toBe(true);
  });
});

describe('a solo phase in the plan', () => {
  const timeline = soloPull();
  const use = (at: number, target: number | null = null): PlannedUse => ({
    player: 2,
    action: 1,
    name: 'Tool',
    at,
    target,
    covers: [],
  });

  it("keeps a party mitigation used in it off everyone else's hits", () => {
    const [tool] = withSoloPhases<MitigationTool>(timeline, [
      {
        player: 2,
        action: 1,
        name: 'Tool',
        recastMs: 60_000,
        charges: 1,
        gcd: false,
        castMs: 0,
        group: 'Tool',
        pool: null,
        grantedBy: null,
        effects: [
          {
            target: 'party',
            physical: 10,
            magic: 10,
            shield: null,
            hits: 1,
            durationMs: 15_000,
            status: 'Tool',
            stack: 'Tool',
            invulnerable: null,
          },
        ],
      },
    ]);
    const mechanic = (at: number): Mechanic => ({
      id: 0,
      at,
      action: 100,
      name: 'Grasp',
      kind: 'raidwide',
      damageType: 'magic',
      hits: [],
    });
    const hit = (player: number) => ({ player, unmitigated: 1, asPlayed: 1, avoidable: false });
    expect(reaches(tool, use(120_000), mechanic(125_000), hit(2))).toHaveLength(1);
    expect(reaches(tool, use(120_000), mechanic(125_000), hit(1))).toHaveLength(0);
    expect(reaches(tool, use(170_000), mechanic(175_000), hit(1))).toHaveLength(1);
  });

  it('lands a heal given to someone else in it on no one', () => {
    const [tool] = withSoloPhases<HealTool>(timeline, [
      {
        player: 2,
        action: 1,
        name: 'Tool',
        recastMs: 0,
        charges: 1,
        gcd: true,
        castMs: 0,
        group: 'Tool',
        pool: null,
        grantedBy: null,
        cost: 'gcd',
        effects: [{ target: 'target', size: { hp: 10_000 }, status: null, statusId: null, ticks: 0 }],
        delayed: null,
      },
    ]);
    const maxHp = new Map([1, 2, 3].map((p) => [p, 100_000]));
    expect(healEvents(tool, use(120_000, 1), [1, 2, 3], maxHp)).toEqual([]);
    expect(healEvents(tool, use(120_000, 2), [1, 2, 3], maxHp)).toHaveLength(1);
  });
});
