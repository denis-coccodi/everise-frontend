import { PlannerScheduler } from './planner-scheduler.service';
import { catalog, pull } from './scheduler-fixtures';

describe('PlannerScheduler', () => {
  const plan = (hits: [number, string, number, number][], margin = 0.1) =>
    new PlannerScheduler().plan(pull(hits), catalog(), { margin });
  const usesOf = (p: ReturnType<typeof plan>) => p.uses.map((u) => [u.name, u.at / 1000]);

  it('mitigates a tank buster until it leaves the margin, half a second before it lands', () => {
    const p = plan([[60, 'Buster', 1, 120_000]]);

    expect(p.hits[0]).toMatchObject({ player: 1, unmitigated: 120_000, safe: true });
    expect(p.hits[0].planned).toBeLessThanOrEqual(90_000);
    expect(p.uses.every((u) => u.at === 59_500 && u.covers.includes(0))).toBe(true);
    expect(p.hits[0].covers.length).toBeGreaterThan(0);
  });

  it("keeps the long cooldowns for the bigger hit when they can't cover both", () => {
    // Guardian (120s) can't cover both busters; the second is bigger.
    const p = plan([
      [30, 'Small buster', 1, 95_000],
      [90, 'Big buster', 1, 130_000],
    ]);

    const guardian = p.uses.filter((u) => u.name === 'Guardian');
    expect(guardian.map((u) => u.at)).toEqual([89_500]);
    expect(p.hits.every((h) => h.safe)).toBe(true);
  });

  it('keeps every use a recast from the last', () => {
    const busters: [number, string, number, number][] = [10, 40, 70, 100, 130, 160].map((at) => [
      at,
      'Buster',
      1,
      95_000,
    ]);
    const p = plan(busters);

    for (const name of ['Guardian', 'Rampart', 'Reprisal']) {
      const times = p.uses.filter((u) => u.name === name).map((u) => u.at);
      const recast = { Guardian: 120_000, Rampart: 90_000, Reprisal: 60_000 }[name] as number;
      for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(recast);
    }
  });

  it('covers a raidwide with party mitigations, and says when nothing can make a hit safe', () => {
    const p = plan([
      [30, 'Raidwide', 1, 80_000],
      [30, 'Raidwide', 2, 95_000],
      [30, 'Raidwide', 3, 95_000],
      [200, 'Wall', 2, 400_000],
    ]);

    const raidwide = p.hits.filter((h) => h.mechanic === 0);
    expect(raidwide.every((h) => h.safe)).toBe(true);
    expect(raidwide[1].covers).toEqual(expect.arrayContaining(['Sacred Soil']));
    const wall = p.hits.find((h) => h.mechanic === 1);
    expect(wall).toMatchObject({ safe: false });
    expect(wall?.share).toBeGreaterThan(0.9);
  });

  it("uses nothing on hits that don't need it", () => {
    expect(usesOf(plan([[30, 'Tickle', 3, 20_000]]))).toEqual([]);
  });
});
