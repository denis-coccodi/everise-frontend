import { mechanicsOf, missingAttacks, referenceDamage } from './mechanics';
import { pull } from './scheduler-fixtures';

describe('mechanicsOf', () => {
  it("groups an attack's hits landing together, and says what kind each is", () => {
    const mechanics = mechanicsOf(
      pull([
        [10, 'Raidwide', 1, 50_000],
        [10.4, 'Raidwide', 2, 50_000],
        [10.8, 'Raidwide', 3, 50_000],
        [20, 'Buster', 1, 90_000],
        [30, 'Spread', 2, 30_000],
        [30, 'Spread', 3, 30_000],
      ]),
    );

    expect(mechanics.map((m) => [m.name, m.at, m.kind, m.hits.map((h) => h.player)])).toEqual([
      ['Raidwide', 10_000, 'raidwide', [1, 2, 3]],
      ['Buster', 20_000, 'tankbuster', [1]],
      ['Spread', 30_000, 'targeted', [2, 3]],
    ]);
  });

  it('keeps the same attack a second later apart', () => {
    const mechanics = mechanicsOf(
      pull([
        [10, 'Blood Lash', 1, 50_000],
        [13, 'Blood Lash', 1, 50_000],
      ]),
    );

    expect(mechanics.map((m) => m.at)).toEqual([10_000, 13_000]);
  });

  it('leaves out auto-attacks, ticks and hits that did nothing', () => {
    const timeline = pull([
      [5, 'Attack', 1, 20_000],
      [6, 'Puddle', 2, 0],
      [7, 'Bleed', 3, 5_000],
      [8, 'Raidwide', 1, 50_000],
    ]);
    timeline.damage[2].tick = true;

    expect(mechanicsOf(timeline).map((m) => m.name)).toEqual(['Raidwide']);
  });

  it("gives a hit an invulnerability blocked the attack's usual damage, on that player", () => {
    const timeline = pull([
      [20, 'Buster', 1, 120_000],
      [60, 'Buster', 1, 0],
      [100, 'Buster', 1, 130_000],
      [100, 'Buster', 2, 60_000],
    ]);
    // Hallowed Ground at 60s: the log has nothing of it, not even what it would have done.
    timeline.damage[1].unmitigated = null;
    timeline.damage[1].statuses = [82];
    timeline.statuses = [{ id: 82, name: 'Hallowed Ground' }];
    // An attack the pull has no other hit of stays out, as does a hit of
    // nothing with no invulnerability up (an attack doing nothing to some).
    const lone = pull([[60, 'Lone Buster', 1, 0]]);
    lone.damage[0].unmitigated = null;
    lone.damage[0].statuses = [82];
    lone.statuses = [{ id: 82, name: 'Hallowed Ground' }];
    const nothing = pull([
      [20, 'Bondage', 1, 50_000],
      [60, 'Bondage', 2, 0],
    ]);
    nothing.damage[1].unmitigated = null;

    const blocked = mechanicsOf(timeline).find((m) => m.at === 60_000);

    // The median of the tank's own (120,000, 130,000), not the healer's.
    expect(blocked?.hits).toEqual([
      { player: 1, unmitigated: 130_000, asPlayed: 0, avoidable: false, estimated: 'pull' },
    ]);
    expect(mechanicsOf(lone)).toEqual([]);
    expect(mechanicsOf(nothing).map((m) => m.at)).toEqual([20_000]);
  });

  it("takes an attack blocked every time from other groups' kills: their role's, else anyone's", () => {
    const lone = pull([[60, 'Lone Buster', 1, 0]]);
    lone.damage[0].unmitigated = null;
    lone.damage[0].statuses = [82];
    lone.statuses = [{ id: 82, name: 'Hallowed Ground' }];
    expect(missingAttacks(lone)).toEqual(['Lone Buster']);

    // Two kills: the tank (1, PLD) took 200,000 and 220,000, the healer 90,000.
    const kills = [
      pull([[30, 'Lone Buster', 1, 200_000]]),
      pull([
        [40, 'Lone Buster', 1, 220_000],
        [40, 'Lone Buster', 2, 90_000],
      ]),
    ];
    const references = referenceDamage(kills, ['Lone Buster', 'Never Seen']);

    expect(references).toEqual({ 'Lone Buster': { byRole: { tank: 220_000, healer: 90_000 }, any: 200_000 } });
    expect(mechanicsOf({ ...lone, references })[0].hits).toEqual([
      { player: 1, unmitigated: 220_000, asPlayed: 0, avoidable: false, estimated: 'clears' },
    ]);
  });

  it('marks a failed mechanic: many times what the attack does to others, and more than their HP', () => {
    // The bard missed a tower: 2.8M where the others took 90,000. The
    // paladin's 300,000 buster, alone of its kind, is no failure.
    const mechanics = mechanicsOf(
      pull([
        [10, 'Tower', 1, 90_000],
        [10, 'Tower', 2, 90_000],
        [10, 'Tower', 3, 2_800_000],
        [40, 'Tower', 2, 90_000],
        [70, 'Buster', 1, 300_000],
      ]),
    );

    expect(mechanics.flatMap((m) => m.hits.filter((h) => h.avoidable).map((h) => [m.name, h.player]))).toEqual([
      ['Tower', 3],
    ]);
  });

  it('takes a raidwide nobody survives as a wipe, avoided, and only that', () => {
    // Ten million on each (max HP 100,000), killing them: an enrage. A
    // raidwide one player survives (150,000 on one only) is still an attack
    // to cover, and so is one as big that everyone survived (a tank Limit
    // Break was up).
    const t = pull([
      [10, 'Enrage', 1, 10_000_000],
      [10, 'Enrage', 2, 10_000_000],
      [10, 'Enrage', 3, 10_000_000],
      [40, 'Big Wave', 1, 150_000],
      [40, 'Big Wave', 2, 400_000],
      [40, 'Big Wave', 3, 400_000],
      [70, 'Cosmic Wave', 1, 2_000_000],
      [70, 'Cosmic Wave', 2, 2_000_000],
      [70, 'Cosmic Wave', 3, 2_000_000],
    ]);
    t.damage = t.damage.map((h) => (h.at === 10_000 ? { ...h, overkill: 9_900_000 } : h));
    const mechanics = mechanicsOf(t);

    expect(mechanics.map((m) => [m.name, !!m.wipe, m.hits.every((h) => h.avoidable)])).toEqual([
      ['Enrage', true, true],
      ['Big Wave', false, false],
      ['Cosmic Wave', false, false],
    ]);
  });

  it('counts a big hit the player survived as a hit to cover, and one that killed them as failed', () => {
    // The scholar took 150,000 from a tower, five times the others' 30,000
    // and more than their 100,000 HP: survived as played, it's no failure.
    // The bard took as much and died of it: a failure. The paladin took
    // 150,000 at 70s and didn't die then either.
    const t = pull([
      [10, 'Tower', 1, 30_000],
      [10, 'Tower', 2, 150_000],
      [10, 'Tower', 3, 30_000],
      [40, 'Tower', 1, 30_000],
      [40, 'Tower', 2, 30_000],
      [40, 'Tower', 3, 150_000],
      [70, 'Tower', 1, 150_000],
      [70, 'Tower', 2, 30_000],
      [70, 'Tower', 3, 30_000],
    ]);
    t.deaths = [
      { at: 40_500, player: 3, action: 0, source: null },
      { at: 90_000, player: 1, action: 0, source: null },
    ];

    const marked = (ignore: boolean, key: 'failed' | 'avoidable') =>
      mechanicsOf(t, ignore).flatMap((m) => m.hits.filter((h) => h[key]).map((h) => [m.at, h.player]));

    // Failed either way; avoided only when failed mechanics are ignored.
    expect(marked(false, 'failed')).toEqual([[40_000, 3]]);
    expect(marked(false, 'avoidable')).toEqual([]);
    expect(marked(true, 'avoidable')).toEqual([[40_000, 3]]);
  });

  it("marks a hit the log has them at no HP after, yet alive, as one that can't kill", () => {
    // Dancing Mad's Black Antilight: their whole HP and more, and they're
    // healed after. The bard's killed them: they died.
    const t = pull([
      [10, 'Black Antilight', 1, 300_000],
      [10, 'Black Antilight', 2, 300_000],
      [10, 'Black Antilight', 3, 300_000],
    ]);
    t.damage = t.damage.map((h) => ({ ...h, amount: 100_000, overkill: 200_000, hp: 0 }));
    t.deaths = [{ at: 10_500, player: 3, action: 0, source: null }];

    const [m] = mechanicsOf(t);

    expect(m.hits.map((h) => [h.player, !!h.leavesOneHp])).toEqual([
      [1, true],
      [2, true],
      [3, false],
    ]);
  });

  it("never takes a hit past a completed wipe's end as failed: one the other group failed lands as usual", () => {
    // The wipe ends at 60s; the rest is another group's kill. The scholar
    // failed the 30s tower themselves (ten times the rest); the kill's bard
    // failed the one at 90s.
    const t = {
      ...pull([
        [30, 'Tower', 1, 30_000],
        [30, 'Tower', 2, 400_000],
        [30, 'Tower', 3, 30_000],
        [90, 'Tower', 1, 30_000],
        [90, 'Tower', 2, 30_000],
        [90, 'Tower', 3, 400_000],
      ]),
      completion: { from: 60_000, clear: { code: 'Other0000000000a', pullId: 7 } },
    };

    const [played, completed] = mechanicsOf(t);

    expect(played.hits.find((h) => h.player === 2)).toMatchObject({ failed: true, avoidable: true });
    expect(completed.hits.find((h) => h.player === 3)).toMatchObject({
      unmitigated: 30_000,
      avoidable: false,
      estimated: 'completion',
    });
    expect(completed.hits.some((h) => h.failed)).toBe(false);
  });

  it("judges a wipe's hits by what other groups' kills say the attack does: once in the pull, or never in a kill", () => {
    // The bard dies to Fireball once (3,000,000; the kills' bards take
    // 150,000) and the scholar to Puddle (none of the kills has it); the
    // paladin's 150,000 Fireball is as the kills have it.
    const wipe = pull([
      [10, 'Fireball', 1, 150_000],
      [10, 'Fireball', 3, 3_000_000],
      [20, 'Puddle', 2, 400_000],
    ]);
    wipe.deaths = [
      { at: 10_500, player: 3, action: 0, source: null },
      { at: 20_500, player: 2, action: 0, source: null },
    ];
    const kill = pull([
      [10, 'Fireball', 1, 150_000],
      [10, 'Fireball', 3, 150_000],
    ]);

    const marked = (t: Parameters<typeof mechanicsOf>[0]) =>
      mechanicsOf(t).flatMap((m) => m.hits.filter((h) => h.failed).map((h) => [m.name, h.player]));

    expect(marked({ ...wipe, clears: [kill], clearsFrom: 'kills' })).toEqual([
      ['Fireball', 3],
      ['Puddle', 2],
    ]);
    // Without kills (or with the report's own later pulls), the pull alone.
    expect(marked(wipe)).toEqual([]);
    expect(marked({ ...wipe, clears: [kill], clearsFrom: 'report' })).toEqual([]);
  });
});
