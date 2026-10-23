import { Plan, PlanOptions } from './plan.model';
import { PlannerScheduler } from './planner-scheduler.service';
import { action, catalog, heal, pull } from './scheduler-fixtures';

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

  it("mitigates a tank buster until it leaves the margin, each of a player's a weave apart", () => {
    const p = plan([[60, 'Buster', 1, 120_000]]);

    expect(p.hits[0]).toMatchObject({ player: 1, unmitigated: 120_000, safe: true });
    expect(p.hits[0].planned).toBeLessThanOrEqual(90_000);
    expect(p.uses.every((u) => u.at <= 59_500 && u.covers.includes(0))).toBe(true);
    // One oGCD at a time: none of a player's within 0.7s of another.
    for (const player of [1, 2, 3]) {
      const times = p.uses.filter((u) => u.player === player).map((u) => u.at);
      for (const a of times) for (const b of times) if (a !== b) expect(Math.abs(a - b)).toBeGreaterThanOrEqual(700);
    }
    expect(Math.max(...p.uses.map((u) => u.at))).toBe(59_500);
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

  it('plans again around the HP a hit lands on when no heal can fill it', () => {
    // A gaze no mitigation lowers, then a buster that would be fine at full
    // HP: nothing heals in between, so it lands on 50,000.
    const timeline = pull([
      [30, 'Gaze', 1, 60_000],
      [50, 'Buster', 1, 44_000],
    ]);
    timeline.damage[0].damageType = 'unique';

    const p = new PlannerScheduler().plan(timeline, catalog(), { margin: 0.1 });

    const buster = p.hits[1];
    expect(buster).toMatchObject({ hpBefore: 50_000, safe: true });
    expect(buster.planned).toBeLessThanOrEqual(40_000);
    expect(p.uses.find((u) => u.name === 'Guardian')?.at).toBe(49_500);
  });

  it('uses Divine Caress only once after each Temperance, whatever its own recast', () => {
    // The scholar as a white mage, with Divine Caress's 1s recast.
    const cat = catalog();
    cat.actions.push(
      action(16536, 'Temperance', ['SCH'], 120, [
        {
          ...heal(0),
          kind: 'mitigation',
          target: 'party',
          status: 'Temperance',
          potency: null,
          percent: 10,
          durationMs: 20_000,
        },
      ]),
      action(37011, 'Divine Caress', ['SCH'], 1, [
        { ...heal(0), kind: 'shield', target: 'party', status: 'Divine Grace', potency: 400, durationMs: 10_000 },
      ]),
    );
    const raidwide = (at: number): [number, string, number, number][] =>
      [1, 2, 3].map((player) => [at, `Raidwide ${at}`, player, 95_000]);
    const p = new PlannerScheduler().plan(
      pull([...raidwide(30), ...raidwide(40), ...raidwide(50), ...raidwide(60)], healed),
      cat,
      { margin: 0.1 },
    );

    const at = (name: string) => p.uses.filter((u) => u.name === name).map((u) => u.at);
    expect(at('Divine Caress')).toHaveLength(1);
    const [temperance] = at('Temperance');
    expect(at('Divine Caress')[0] - temperance).toBeGreaterThanOrEqual(0);
    expect(at('Divine Caress')[0] - temperance).toBeLessThanOrEqual(30_000);
  });

  it('spends nothing on a failed mechanic, and counts it as avoided, not short', () => {
    const p = plan([
      [30, 'Tower', 1, 20_000],
      [30, 'Tower', 2, 20_000],
      [30, 'Tower', 3, 2_800_000],
    ]);

    expect(p.hits[2]).toMatchObject({ player: 3, avoidable: true, safe: true, planned: 0 });
    expect(p.uses.filter((u) => u.covers.includes(0))).toEqual([]);
  });

  describe('tank invulnerabilities', () => {
    const invulnerable = (id: number, name: string): ReturnType<typeof action> =>
      action(id, name, ['PLD'], 420, [
        { ...heal(0), kind: 'invulnerable', target: 'self', status: name, potency: null, durationMs: 10_000 },
      ]);
    const planWith = (tool: ReturnType<typeof action>, hits: [number, string, number, number][]) => {
      const cat = catalog();
      cat.actions.push(tool);
      return new PlannerScheduler().plan(pull(hits, healed), cat, { margin: 0.1 });
    };

    it('uses one only where nothing else will do, and nothing else for that hit', () => {
      // Twenty times the tank's HP, then a buster mitigation can handle.
      const p = planWith(invulnerable(30, 'Hallowed Ground'), [
        [60, 'Big buster', 1, 2_000_000],
        [90, 'Buster', 1, 95_000],
      ]);

      expect(p.hits[0]).toMatchObject({ planned: 0, safe: true, invulnerable: true, covers: ['Hallowed Ground'] });
      expect(p.uses.filter((u) => u.covers.includes(0)).map((u) => [u.name, u.at])).toEqual([
        ['Hallowed Ground', 59_500],
      ]);
      expect(p.hits[1]).toMatchObject({ safe: true, invulnerable: false });
    });

    it('heals the tank by their max HP in the 10s of Walking Dead after Living Dead', () => {
      const p = planWith(invulnerable(3638, 'Living Dead'), [[60, 'Big buster', 1, 2_000_000]]);

      expect(p.hits[0]).toMatchObject({ safe: true, invulnerable: true });
      const heals = p.uses.filter((u) => u.name === 'Lustrate' && u.at > 60_000 && u.at < 70_000);
      // 60,000 each: two bring them from 1 HP to their 100,000.
      expect(heals.length).toBeGreaterThanOrEqual(2);
      expect(heals.every((u) => u.covers.includes(0))).toBe(true);
    });

    it("lets the tank's own GCDs heal them out of Walking Dead, the healers leaving it to them", () => {
      const cat = catalog();
      cat.actions.push(invulnerable(3638, 'Living Dead'));
      const timeline = pull([[60, 'Big buster', 1, 2_000_000]], healed);
      // Their GCDs every 2.5s: each heals 1,500 potency under it.
      timeline.playerCasts = [55, 57.5, 60, 62.5, 65, 67.5].map((at) => ({
        at: at * 1000,
        source: 1,
        target: 13,
        action: 9,
        castMs: null,
      }));

      const p = new PlannerScheduler().plan(timeline, cat, { margin: 0.1 });

      expect(p.hits[0]).toMatchObject({ safe: true, invulnerable: true });
      expect(p.uses.filter((u) => u.name === 'Lustrate' && u.at > 60_000 && u.at < 70_000)).toEqual([]);
    });

    it('says the tank dies under Living Dead when nothing can heal them full', () => {
      // No heals in the pull: the planner can't tell what the scholar's do.
      const cat = catalog();
      cat.actions.push(invulnerable(3638, 'Living Dead'));
      const p = new PlannerScheduler().plan(pull([[60, 'Big buster', 1, 2_000_000]]), cat, { margin: 0.1 });

      expect(p.hits[0]).toMatchObject({ invulnerable: true, safe: false });
    });

    it('heals the tank back up from the 1 HP Superbolide leaves', () => {
      const p = planWith(invulnerable(16152, 'Superbolide'), [
        [60, 'Big buster', 1, 2_000_000],
        [80, 'Buster', 1, 50_000],
      ]);

      expect(p.hits[0]).toMatchObject({ planned: 0, safe: true });
      const lustrate = p.uses.find((u) => u.name === 'Lustrate');
      expect(lustrate?.at).toBeGreaterThan(60_000);
      expect(lustrate?.at).toBeLessThan(80_000);
      expect(p.hits[1]).toMatchObject({ hpBefore: 60_001, safe: true });
    });

    describe('where the group has them', () => {
      // Two busters mitigation can handle, Hallowed Ground used for the
      // first in the pull, and one nothing but an invulnerability saves.
      const planAs = (options: Partial<PlanOptions> = {}) => {
        const cat = catalog();
        cat.actions.push(invulnerable(30, 'Hallowed Ground'));
        const timeline = pull(
          [
            [60, 'Buster', 1, 95_000],
            [120, 'Buster', 1, 95_000],
            [600, 'Big buster', 1, 2_000_000],
          ],
          healed,
        );
        timeline.playerCasts = [{ at: 58_000, source: 1, target: null, action: 30, castMs: null }];
        return new PlannerScheduler().plan(timeline, cat, { margin: 0.1, ...options });
      };
      const grounds = (p: Plan) => p.uses.filter((u) => u.name === 'Hallowed Ground').map((u) => u.at);

      it('keeps them as played, and adds one where nothing else saves a hit', () => {
        const p = planAs();

        expect(grounds(p)).toEqual([59_500, 599_500]);
        expect(p.hits[0]).toMatchObject({ planned: 0, invulnerable: true });
        expect(p.unplaced).toEqual([]);
      });

      it('moves one to the mechanic asked for, or never uses it', () => {
        expect(grounds(planAs({ invulnerabilities: [{ player: 1, action: 30, mechanic: 1 }] }))).toEqual([
          119_500, 599_500,
        ]);
        const never = planAs({ invulnerabilities: [{ player: 1, action: 30, mechanic: null }] });
        expect(grounds(never)).toEqual([]);
        expect(never.hits[2].safe).toBe(false);
      });

      it("says which it couldn't use where asked", () => {
        const asked = [
          { player: 1, action: 30, mechanic: 0 },
          { player: 1, action: 30, mechanic: 1 },
        ];
        const p = planAs({ invulnerabilities: asked });

        expect(grounds(p)).toEqual([59_500, 599_500]);
        expect(p.unplaced).toEqual([asked[1]]);
      });
    });
  });

  describe('replanning some players only', () => {
    // A buster Rampart alone leaves 6,000 short; the paladin used only
    // Rampart for it in the pull.
    const planFor = (replan: number[]) => {
      const timeline = pull([[60, 'Buster', 1, 120_000]], healed);
      timeline.playerCasts = [{ at: 58_000, source: 1, target: 13, action: 7531, castMs: null }];
      return new PlannerScheduler().plan(timeline, catalog(), { margin: 0.1, replan });
    };
    const usesBy = (p: Plan, player: number) => p.uses.filter((u) => u.player === player).map((u) => [u.name, u.at]);

    it("keeps the others' actions as played and plans the rest around them", () => {
      const p = planFor([2]);

      expect(usesBy(p, 1)).toEqual([['Rampart', 58_000]]);
      expect(usesBy(p, 2).length).toBeGreaterThan(0);
      expect(usesBy(p, 3)).toEqual([]);
      expect(p.hits[0]).toMatchObject({ safe: true });
      expect(p.hits[0].covers).toContain('Rampart');
    });

    it("plans nothing for those it doesn't replan", () => {
      const p = planFor([1]);

      expect(p.uses.every((u) => u.player === 1)).toBe(true);
      expect(usesBy(p, 1)).not.toContainEqual(['Rampart', 58_000]);
    });
  });
});
