import { kindFirst, stretchHeals } from './kind-first';
import type { Candidate } from './mitigation-plan.model';
import type { HealTool, Mechanic, MechanicHit, MitigationTool } from './plan.model';
import { Weaving } from './weaving';

// Player 1 a tank (max HP 100,000), 2-8 the rest.
const maxHp = new Map(Array.from({ length: 8 }, (_, i) => [i + 1, 100_000]));
const hit = (player: number, unmitigated: number): MechanicHit => ({
  player,
  unmitigated,
  asPlayed: 0,
  avoidable: false,
});
const raidwide = (id: number, at: number, each = 30_000): Mechanic => ({
  id,
  at,
  action: id,
  name: `R${id}`,
  kind: 'raidwide',
  damageType: 'magic',
  hits: Array.from({ length: 8 }, (_, i) => hit(i + 1, each)),
});
const buster = (id: number, at: number, size: number): Mechanic => ({
  id,
  at,
  action: id,
  name: `B${id}`,
  kind: 'tankbuster',
  damageType: 'physical',
  hits: [hit(1, size)],
});
const tool = (action: number, durationMs: number) =>
  ({ player: 2, action, name: `T${action}`, effects: [{ durationMs }] }) as unknown as MitigationTool;

describe('kindFirst', () => {
  // A stretch of three raidwides from 10s, a lone one at 60s; a heavy buster at 100s just after a raidwide at 95s, a
  // heavy one alone at 150s, a light one at 200s.
  const mechanics = [
    raidwide(1, 10_000),
    raidwide(2, 14_000),
    raidwide(3, 18_000),
    raidwide(4, 60_000),
    raidwide(5, 95_000),
    buster(6, 100_000, 90_000),
    buster(7, 150_000, 90_000),
    buster(8, 200_000, 30_000),
  ];
  const placed = (t: MitigationTool, short = () => true) => {
    const at: number[] = [];
    const best = (m: Mechanic, o: MitigationTool) => ({ use: { at: m.at }, tool: o, value: 1 }) as unknown as Candidate;
    kindFirst(
      mechanics,
      [t],
      mechanics,
      best,
      (c) => at.push(c.use.at),
      maxHp,
      () => short,
    );
    return at;
  };

  it('puts a multi-hit skill on each stretch of several raidwides in its effect, not on one alone', () => {
    expect(placed(tool(24311, 15_000))).toEqual([10_000]);
  });

  it('puts a buster skill on the heavy busters still short, and Taurochole only on one just after a raidwide', () => {
    expect(placed(tool(25861, 8_000))).toEqual([100_000, 150_000]);
    expect(placed(tool(25861, 8_000), () => false)).toEqual([]);
    expect(placed(tool(24303, 15_000))).toEqual([100_000]);
  });
});

describe('kindFirst on busters', () => {
  it('gives each heavy buster still short one buster skill, the one that takes the most off', () => {
    const mechanics = [buster(1, 100_000, 90_000), buster(2, 150_000, 90_000)];
    const tools = [tool(25861, 8_000), tool(25873, 8_000)];
    const added: [number, number][] = [];
    // Exaltation takes more off than Aquaveil.
    const best = (m: Mechanic, o: MitigationTool) =>
      ({ use: { at: m.at, action: o.action }, tool: o, value: o.action === 25873 ? 2 : 1 }) as unknown as Candidate;
    kindFirst(
      mechanics,
      tools,
      mechanics,
      best,
      (c) => added.push([c.use.at, c.use.action]),
      maxHp,
      () => () => true,
    );
    expect(added).toEqual([
      [100_000, 25873],
      [150_000, 25873],
    ]);
  });
});

describe('stretchHeals', () => {
  const liturgy = {
    player: 2,
    action: 25862,
    name: 'Liturgy of the Bell',
    recastMs: 180_000,
    charges: 1,
    gcd: false,
    castMs: 0,
    group: '2:liturgy',
    pool: null,
  } as unknown as HealTool;
  const events = () => [];

  it('goes in just before the heaviest stretch first, and where its recast allows', () => {
    // A light stretch at 30s, a heavy one at 100s: Liturgy can't be back for both.
    const mechanics = [
      raidwide(1, 30_000, 10_000),
      raidwide(2, 34_000, 10_000),
      raidwide(3, 38_000, 10_000),
      raidwide(4, 100_000),
      raidwide(5, 104_000),
      raidwide(6, 108_000),
    ];
    const spent: Parameters<typeof stretchHeals>[1] = [];
    const { uses } = stretchHeals([liturgy], spent, new Weaving(), events, mechanics);
    expect(uses.map((u) => u.at)).toEqual([99_000]);
    expect(spent.map((s) => s.at)).toEqual([99_000]);
  });

  it('takes no other heal, nor a stretch of fewer than three', () => {
    const mechanics = [raidwide(1, 30_000), raidwide(2, 34_000)];
    expect(stretchHeals([liturgy], [], new Weaving(), events, mechanics).uses).toEqual([]);
    const other = { ...liturgy, action: 3571 } as HealTool;
    expect(stretchHeals([other], [], new Weaving(), events, [...mechanics, raidwide(3, 38_000)]).uses).toEqual([]);
  });
});
