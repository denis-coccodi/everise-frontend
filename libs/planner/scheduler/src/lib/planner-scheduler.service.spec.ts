import { PlannerScheduler } from './planner-scheduler.service';
import { catalog, pull } from './scheduler-fixtures';

describe('PlannerScheduler', () => {
  // The scholar healed 60,000 with a 600 potency Lustrate: 100 HP a potency.
  const healed: [number, number, number, number][] = [[1, 2, 189, 60_000]];
  const plan = (hits: [number, string, number, number][], margin = 0.1) =>
    new PlannerScheduler().plan(pull(hits, healed), catalog(), { margin });
  const usesOf = (p: ReturnType<typeof plan>) => p.uses.map((u) => [u.name, u.at / 1000]);

  it("shields what mitigation can't bring within the margin, a GCD shield last", () => {
    // 150,000 on the scholar: 103,275 after Reprisal, Sacred Soil and
    // Troubadour, more than the 90,000 the margin allows.
    const p = plan([
      [30, 'Raidwide', 1, 60_000],
      [30, 'Raidwide', 2, 150_000],
      [30, 'Raidwide', 3, 60_000],
    ]);
    const scholar = p.hits.find((h) => h.player === 2);

    expect(scholar?.safe).toBe(true);
    expect(scholar?.absorbed).toBeGreaterThan(0);
    expect(scholar?.covers).toEqual(expect.arrayContaining(['Divine Veil', 'Galvanize']));
    expect(p.uses.find((u) => u.name === 'Adloquium')).toMatchObject({ player: 2, target: 2, at: 29_500 });
  });

  it('spends no GCD on spare margin', () => {
    // Heavy (more than half the allowed 90,000) but safe without anything.
    const p = plan([[30, 'Spread', 3, 60_000]]);

    expect(p.hits[0].safe).toBe(true);
    expect(p.uses.map((u) => u.name)).not.toContain('Adloquium');
  });

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

  it('heals the player up for the next hit, an oGCD before a GCD, and judges each hit by the HP it leaves', () => {
    // The auto-attack leaves the tank short for the second buster.
    const p = plan([
      [30, 'Buster', 1, 95_000],
      [45, 'Attack', 1, 60_000],
      [60, 'Buster', 1, 95_000],
    ]);

    const heal = p.uses.find((u) => u.name === 'Lustrate');
    expect(heal).toMatchObject({ player: 2, target: 1, covers: [1] });
    expect(heal?.at).toBeGreaterThan(30_000);
    expect(heal?.at).toBeLessThan(60_000);
    expect(p.uses.map((u) => u.name)).not.toContain('Physick');
    const second = p.hits[1];
    expect(second.safe).toBe(true);
    expect((second.hpBefore ?? 0) - second.planned).toBeGreaterThanOrEqual(10_000);
  });

  it("says a hit isn't safe when nothing heals the player up for it", () => {
    // No heals in the pull: the planner can't tell what the scholar's do.
    const p = new PlannerScheduler().plan(
      pull([
        [30, 'Buster', 1, 95_000],
        [45, 'Attack', 1, 60_000],
        [60, 'Buster', 1, 95_000],
      ]),
      catalog(),
      { margin: 0.1 },
    );

    expect(p.hits[0]).toMatchObject({ safe: true, hpBefore: 100_000 });
    expect(p.hits[1].safe).toBe(false);
    expect(p.hits[1].hpBefore).toBeLessThan(100_000);
  });

  it("uses nothing on hits that don't need it", () => {
    expect(usesOf(plan([[30, 'Tickle', 3, 20_000]]))).toEqual([]);
  });
});
