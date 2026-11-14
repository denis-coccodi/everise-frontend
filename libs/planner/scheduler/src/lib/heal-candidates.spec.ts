import type { HealTool, Mechanic } from './plan.model';
import { followsUp, waitsForBiggerNeed } from './heal-candidates';

// Raidwides at 60s and 100s; the second takes the party twice as much.
const mechanic = (id: number, at: number): Mechanic => ({
  id,
  at,
  action: id,
  name: `M${id}`,
  kind: 'raidwide',
  damageType: 'magic',
  hits: [],
});
const mechanics = [mechanic(1, 60_000), mechanic(2, 100_000)];
const needOf = (m: Mechanic) => (m.id === 2 ? 4 : 2);
const tool = (recastS: number): HealTool => ({
  player: 2,
  action: 16536,
  name: 'Temperance',
  recastMs: recastS * 1000,
  charges: 1,
  gcd: false,
  castMs: 0,
  group: '2:1',
  pool: null,
  grantedBy: null,
  cost: 'free',
  effects: [],
  delayed: null,
});

describe('waitsForBiggerNeed', () => {
  it('keeps a big cooldown for a stretch taking the party much more within its recast', () => {
    expect(waitsForBiggerNeed(tool(120), mechanics[0], mechanics, needOf)).toBe(true);
  });

  it("lets it go to the bigger need itself, to one out of its recast's reach, or when it's a short cooldown", () => {
    expect(waitsForBiggerNeed(tool(120), mechanics[1], mechanics, needOf)).toBe(false);
    expect(waitsForBiggerNeed(tool(30), mechanics[0], mechanics, needOf)).toBe(false);
    expect(waitsForBiggerNeed(tool(120), mechanics[0], mechanics, () => 2)).toBe(false);
  });
});

describe('followsUp', () => {
  const helios = { ...tool(0), action: 3600, name: 'Helios', gcd: true, cost: 'fallback' as const };
  const cast = (action: number, at: number) => ({ player: 2, action, at, group: '', pool: null, gcd: true, castMs: 0 });

  it("counts Helios as a follow-up while its caster's Helios Conjunction regen is up, as played", () => {
    expect(followsUp(helios, 25_000, [cast(37030, 20_000)])).toBe(true);
    expect(followsUp(helios, 25_000, [cast(3601, 20_000)])).toBe(true);
    expect(followsUp(helios, 36_000, [cast(37030, 20_000)])).toBe(false);
    expect(followsUp(helios, 25_000, [])).toBe(false);
    expect(followsUp({ ...helios, action: 124 }, 25_000, [cast(37030, 20_000)])).toBe(false);
  });
});
