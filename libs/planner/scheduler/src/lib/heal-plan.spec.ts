import { ActionEffect } from '@everise/core/api-types';
import { planHeals } from './heal-plan';
import { healPower } from './heal-power';
import { healPairings, healTools } from './heal-tools';
import { healingBuffsOf } from './healing-buffs';
import { mechanicsOf } from './mechanics';
import { planMitigation } from './mitigation-plan';
import { action, catalog, heal, pull } from './scheduler-fixtures';
import { mitigationTools } from './tools';
import { Weaving } from './weaving';
import { withEnablerWindows } from './enabled-windows';

describe('planHeals', () => {
  it('counts the mitigation of the heals it plans (Kerachole, Holos)', () => {
    // A heal of the whole party that also takes 10% off for 15s.
    const field: ActionEffect = {
      ...heal(0),
      kind: 'mitigation',
      target: 'party',
      status: 'Soothing Field',
      percent: 10,
      potency: null,
      durationMs: 15_000,
    };
    const cat = catalog();
    cat.actions.push(action(99_001, 'Soothing Field', ['SCH'], 30, [field, { ...heal(500), target: 'party' }]));
    // The tank lands on 15,000 after the first buster: the field's 50,000
    // heal alone leaves them short of the second's 60,000 and the margin,
    // its 10% makes up the rest.
    const timeline = pull(
      [
        [30, 'Buster', 1, 85_000],
        [40, 'Buster', 1, 60_000],
      ],
      [[1, 2, 189, 60_000]],
    );
    const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp as number]));
    const power = healPower(timeline, cat);
    const only = <T extends { name: string }>(tools: T[]) => tools.filter((t) => t.name === 'Soothing Field');
    const mitigation = only(mitigationTools(timeline.players, cat, power));
    const heals = only(healTools(timeline.players, cat, mitigation, power));
    const options = { margin: 0.1 };

    const plan = planHeals(
      planMitigation(mechanicsOf(timeline), [], maxHp, options),
      timeline,
      mitigation,
      heals,
      maxHp,
      options,
    );

    expect(plan.uses).toEqual([expect.objectContaining({ name: 'Soothing Field', covers: [1] })]);
    expect(plan.hits[1]).toMatchObject({ planned: 54_000, safe: true, covers: ['Soothing Field'] });
    expect(plan.hits[1].hpBefore).toBe(65_000);
  });

  it('heals for more under a healing buff', () => {
    // The tank lands on 15,000 after the first buster, with +20% healing
    // received from 20s as played: one Lustrate heals 72,000 instead of
    // 60,000.
    const cat = catalog();
    cat.actions.push(
      action(65, 'Mantra', ['PLD'], 90, [
        {
          ...heal(0),
          kind: 'healingReceived',
          target: 'party',
          status: 'Mantra',
          statusId: 102,
          percent: 20,
          potency: null,
          durationMs: 15_000,
        },
      ]),
    );
    const timeline = pull(
      [
        [30, 'Buster', 1, 85_000],
        [40, 'Buster', 1, 60_000],
      ],
      [[1, 2, 189, 60_000]],
    );
    timeline.auras = [{ status: 102, source: 1, target: 1, from: 20_000, to: 35_000, stacks: null, shield: null }];
    const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp as number]));
    const power = healPower(timeline, cat);
    const heals = healTools(timeline.players, cat, [], power).filter((t) => t.name === 'Lustrate');
    const options = { margin: 0.1 };

    const plan = planHeals(
      planMitigation(mechanicsOf(timeline), [], maxHp, options),
      timeline,
      [],
      heals,
      maxHp,
      options,
      healingBuffsOf(cat),
    );

    expect(plan.uses.map((u) => u.name)).toEqual(['Lustrate']);
    expect(plan.hits[1].hpBefore).toBe(87_000);
  });

  it('puts up Plenary Indulgence just before a Medica, where its Confession makes up the rest', () => {
    // The scholar as a white mage: the tank lands on 15,000, and needs
    // 55,000 for the second buster. Medica heals 40,000; Confession 20,000
    // more as it lands.
    const cat = catalog();
    cat.actions.push(
      action(124, 'Medica', ['SCH'], 2.5, [{ ...heal(400), target: 'party' }], { gcd: true, castMs: 2000 }),
      action(7433, 'Plenary Indulgence', ['SCH'], 60, [
        {
          ...heal(0),
          kind: 'mitigation',
          target: 'party',
          status: 'Confession',
          potency: null,
          percent: 10,
          durationMs: 10_000,
        },
        { ...heal(200), target: 'party', condition: 'with Medica, Medica III, Cure III or Afflatus Rapture' },
      ]),
    );
    const timeline = pull(
      [
        [30, 'Buster', 1, 85_000],
        [40, 'Buster', 1, 60_000],
      ],
      [[1, 2, 189, 60_000]],
    );
    const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp as number]));
    const power = healPower(timeline, cat);
    const mitigation = mitigationTools(timeline.players, cat, power).filter((t) => t.name === 'Plenary Indulgence');
    const heals = healTools(timeline.players, cat, [], power).filter((t) => t.name === 'Medica');
    const pairings = healPairings(timeline.players, cat, power);
    const options = { margin: 0.1 };
    const plan = (paired = pairings) =>
      planHeals(
        planMitigation(mechanicsOf(timeline), [], maxHp, options),
        timeline,
        mitigation,
        heals,
        maxHp,
        options,
        new Map(),
        new Weaving(),
        paired,
      );

    const withIt = plan();
    expect(withIt.uses.map((u) => u.name)).toEqual(['Plenary Indulgence', 'Medica']);
    const [plenary, medica] = withIt.uses;
    expect(medica.at - plenary.at).toBeGreaterThan(0);
    expect(medica.at + 2000 - plenary.at).toBeLessThanOrEqual(10_000);
    expect(withIt.hits[1]).toMatchObject({ safe: true });
    // Without it, it takes a second Medica: a GCD more.
    expect(plan([]).uses.map((u) => u.name)).toEqual(['Medica', 'Medica']);
  });

  it('turns an Adloquium into a heal 2.8 times as big with Emergency Tactics, where the heal is what it takes', () => {
    // The tank lands on 15,000 and needs 55,000 for the second buster:
    // Adloquium heals 30,000 (300 potency, at the 100 HP a potency Lustrate
    // heals as played), its Galvanize too as healing 84,000.
    const cat = catalog();
    cat.actions.push(
      action(185, 'Adloquium', ['SCH'], 2.5, [heal(300)], { gcd: true, castMs: 2000 }),
      action(3586, 'Emergency Tactics', ['SCH'], 15, []),
    );
    const timeline = pull(
      [
        [30, 'Buster', 1, 85_000],
        [40, 'Buster', 1, 60_000],
      ],
      [[1, 2, 189, 60_000]],
    );
    const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp as number]));
    const power = healPower(timeline, cat);
    const heals = healTools(timeline.players, cat, [], power).filter((t) => t.name === 'Adloquium');
    const options = { margin: 0.1 };
    const plan = (paired = healPairings(timeline.players, cat, power)) =>
      planHeals(
        planMitigation(mechanicsOf(timeline), [], maxHp, options),
        timeline,
        [],
        heals,
        maxHp,
        options,
        new Map(),
        new Weaving(),
        paired,
      );

    const withIt = plan();
    expect(withIt.uses.map((u) => u.name)).toEqual(['Emergency Tactics', 'Adloquium']);
    expect(withIt.hits[1]).toMatchObject({ safe: true });
    expect(plan([]).uses.map((u) => u.name)).toEqual(['Adloquium', 'Adloquium']);
  });

  it('puts Horoscope up before a Helios, for Horoscope Helios', () => {
    // The scholar as an astrologian. Everyone lands on 15,000 and needs
    // 85,000 for the second raidwide: Helios heals 40,000, Horoscope Helios
    // 40,000 more as it lands (Horoscope alone, 20,000).
    const cat = catalog();
    cat.actions.push(
      action(3600, 'Helios', ['SCH'], 2.5, [{ ...heal(400), target: 'party' }], { gcd: true, castMs: 1500 }),
      action(16557, 'Horoscope', ['SCH'], 60, [
        {
          ...heal(200),
          kind: 'delayedHeal',
          target: 'party',
          status: 'Horoscope',
          durationMs: 10_000,
          condition: '400 (and 30s) after a Helios; when read again or it ends',
        },
      ]),
    );
    const raidwide = (at: number, damage: number) =>
      [1, 2, 3].map((player): [number, string, number, number] => [at, 'Raidwide', player, damage]);
    const timeline = pull([...raidwide(30, 85_000), ...raidwide(45, 75_000)], [[1, 2, 189, 60_000]]);
    const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp as number]));
    const power = healPower(timeline, cat);
    const heals = healTools(timeline.players, cat, [], power).filter((t) => t.name === 'Helios');
    const options = { margin: 0.1 };

    const plan = planHeals(
      planMitigation(mechanicsOf(timeline), [], maxHp, options),
      timeline,
      [],
      heals,
      maxHp,
      options,
      new Map(),
      new Weaving(),
      healPairings(timeline.players, cat, power),
    );

    expect(plan.uses.map((u) => u.name)).toEqual(['Horoscope', 'Helios']);
    const [horoscope, helios] = plan.uses;
    expect(helios.at + 1500 - horoscope.at).toBeLessThanOrEqual(10_000);
    expect(plan.hits.filter((h) => h.mechanic === plan.hits[3].mechanic).every((h) => h.safe)).toBe(true);
  });

  it('moves Kardia to whoever needs it and back, the tank losing its Kardion heals meanwhile', () => {
    // The scholar as a sage, Kardia on the tank (1) as played, healing them
    // 10,000 a damage spell. The bard lands on 15,000 and needs 50,000 for
    // the second raidwide: Kardia on them heals 17,000 a spell.
    const cat = catalog();
    cat.actions.push(action(24285, 'Kardia', ['SCH'], 5, []));
    const timeline = pull(
      [
        [30, 'Raidwide', 3, 85_000],
        [45, 'Raidwide', 3, 40_000],
      ],
      [[1, 2, 189, 60_000]],
    );
    timeline.auras.push({ status: 2605, source: 2, target: 1, from: 0, to: 60_000, stacks: null, shield: null });
    const kardion = (at: number) => ({
      ...timeline.heals[0],
      at,
      target: 1,
      action: null,
      status: 2604,
      amount: 10_000,
    });
    timeline.heals.push(...[33, 36, 39].map((s) => kardion(s * 1000)));
    const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp as number]));
    const power = healPower(timeline, cat);
    const heals = withEnablerWindows(timeline, healTools(timeline.players, cat, [], power)).filter(
      (t) => t.name === 'Kardia',
    );
    const options = { margin: 0.1 };

    const plan = planHeals(
      planMitigation(mechanicsOf(timeline), [], maxHp, options),
      timeline,
      [],
      heals,
      maxHp,
      options,
    );

    // On the bard for its four heals, then pressed again back on the tank:
    // Kardia stays where it's put.
    expect(plan.uses.map((u) => [u.name, u.target, u.back ?? false])).toEqual([
      ['Kardia', 3, false],
      ['Kardia', 1, true],
    ]);
    const [moved, back] = plan.uses;
    expect(back.at - moved.at).toBeGreaterThanOrEqual(12_000);
    expect(plan.hits[1]).toMatchObject({ safe: true });
  });

  it("counts Neutral Sect's barrier on an Aspected Benefic as a shield for the next hit", () => {
    // The scholar as an astrologian: the tank lands on 15,000. Aspected
    // Benefic heals 25,000, 30,000 under Neutral Sect, and leaves a 75,000
    // barrier that takes the whole second buster.
    const cat = catalog();
    cat.actions.push(
      action(3595, 'Aspected Benefic', ['SCH'], 2.5, [heal(250)], { gcd: true }),
      action(16559, 'Neutral Sect', ['SCH'], 120, [
        {
          ...heal(0),
          kind: 'healingPotency',
          target: 'self',
          status: 'Neutral Sect',
          potency: null,
          percent: 20,
          durationMs: 20_000,
        },
      ]),
    );
    const timeline = pull(
      [
        [30, 'Buster', 1, 85_000],
        [40, 'Buster', 1, 60_000],
      ],
      [[1, 2, 189, 60_000]],
    );
    const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp as number]));
    const power = healPower(timeline, cat);
    const heals = healTools(timeline.players, cat, [], power).filter((t) => t.name === 'Aspected Benefic');
    const options = { margin: 0.1, favour: { 2: 'healing' as const } };

    const plan = planHeals(
      planMitigation(mechanicsOf(timeline), [], maxHp, options),
      timeline,
      [],
      heals,
      maxHp,
      options,
      new Map(),
      new Weaving(),
      healPairings(timeline.players, cat, power),
    );

    expect(plan.uses.map((u) => u.name)).toEqual(['Neutral Sect', 'Aspected Benefic']);
    expect(plan.hits[1]).toMatchObject({ planned: 0, absorbed: 60_000, safe: true, covers: ['Neutral Sect'] });
  });

  it('heals with a GCD that costs no damage (Afflatus Solace) before one that does (Cure II)', () => {
    // The scholar as a white mage with lilies to spend: both heal the tank's
    // 60,000, but only one is free of damage.
    const cat = catalog();
    cat.actions.push(
      action(135, 'Cure II', ['SCH'], 2.5, [heal(800)], { gcd: true, castMs: 2000 }),
      action(16531, 'Afflatus Solace', ['SCH'], 2.5, [heal(800)], { gcd: true }),
    );
    const timeline = pull(
      [
        [30, 'Buster', 1, 85_000],
        [40, 'Buster', 1, 60_000],
      ],
      [[1, 2, 189, 60_000]],
    );
    const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp as number]));
    const power = healPower(timeline, cat);
    const heals = healTools(timeline.players, cat, [], power).filter((t) => t.gcd && t.name !== 'Physick');
    const plan = (favour: 'dps' | 'healing') => {
      const options = { margin: 0.1, favour: { 2: favour } };
      return planHeals(planMitigation(mechanicsOf(timeline), [], maxHp, options), timeline, [], heals, maxHp, options);
    };

    // Favouring healing: only the heal the buster needs, and Afflatus Misery
    // at the pull, the Blood Lily being in full bloom (since 7.4).
    expect(plan('healing').uses.map((u) => [u.name, u.damage ?? false])).toEqual([
      ['Afflatus Misery', true],
      ['Afflatus Solace', false],
    ]);
    expect(heals.map((t) => [t.name, t.cost])).toEqual([
      ['Adloquium', 'gcd'],
      ['Cure II', 'gcd'],
      ['Afflatus Solace', 'neutral'],
    ]);
    // Favouring damage: Misery first, then the third lily spent as it comes
    // in, two kept, and Misery again each time three lilies have gone.
    const uses = plan('dps').uses;
    const at = (name: string) => uses.filter((u) => u.name === name).map((u) => u.at);
    const dumps = uses.filter((u) => u.name === 'Afflatus Solace' && !u.covers.length).map((u) => u.at);
    const [first, ...miseries] = at('Afflatus Misery');
    expect(first).toBe(0);
    expect(dumps[0]).toBeGreaterThan(first);
    for (let i = 1; i < dumps.length; i++) expect(dumps[i] - dumps[i - 1]).toBeGreaterThanOrEqual(19_000);
    expect(dumps.length).toBeGreaterThan(20);
    expect(uses.filter((u) => u.overcap).map((u) => u.at)).toEqual(dumps);
    const lilies = at('Afflatus Solace');
    for (const misery of miseries) {
      const since = Math.max(...[first, ...miseries].filter((m) => m < misery));
      expect(lilies.filter((l) => l > since && l < misery)).toHaveLength(3);
    }
  });

  describe('Earthly Star', () => {
    // The scholar as an astrologian, for the star alone: 720 potency, 72,000
    // HP once grown.
    function planWithStar(hits: [number, string, number, number][]) {
      const cat = catalog();
      cat.actions.push(
        action(7439, 'Earthly Star', ['SCH'], 60, [
          { ...heal(720), target: 'party', condition: 'after 10s; 540 if detonated earlier' },
        ]),
        action(8324, 'Stellar Detonation', ['SCH'], 1, [
          { ...heal(540), target: 'party', condition: '720 once the star has grown (10s)' },
        ]),
      );
      const timeline = pull(hits, [[0.5, 2, 189, 60_000]]);
      const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp as number]));
      const power = healPower(timeline, cat);
      const heals = healTools(timeline.players, cat, [], power).filter((t) => t.name === 'Earthly Star');
      const options = { margin: 0.1 };
      return planHeals(planMitigation(mechanicsOf(timeline), [], maxHp, options), timeline, [], heals, maxHp, options);
    }
    const usesOf = (plan: ReturnType<typeof planWithStar>) => plan.uses.map((u) => [u.name, u.at]);

    it('places the star 20s before it heals, where it can go off on its own', () => {
      // The tank lands on 15,000 after the first buster; the grown star
      // brings them to 87,000 for the second.
      const plan = planWithStar([
        [30, 'Buster', 1, 85_000],
        [50, 'Buster', 1, 60_000],
      ]);

      expect(usesOf(plan)).toEqual([['Earthly Star', 11_000]]);
      expect(plan.hits[1]).toMatchObject({ hpBefore: 87_000, safe: true });
    });

    it('puts it down before the pull, in the countdown, for an early hit', () => {
      const plan = planWithStar([
        [15, 'Buster', 1, 85_000],
        [19, 'Buster', 1, 60_000],
      ]);

      // Down at -4s, it goes off on its own at 16s.
      expect(usesOf(plan)).toEqual([['Earthly Star', -4000]]);
      expect(plan.hits[1]).toMatchObject({ hpBefore: 87_000, safe: true });
    });

    it('sets it off with Stellar Detonation once grown, where there are no 20s to wait', () => {
      // The heal must land by 4s: a star down 15s before the pull at most
      // would only go off on its own at 5s.
      const plan = planWithStar([
        [1.5, 'Buster', 1, 85_000],
        [4.5, 'Buster', 1, 60_000],
      ]);

      expect(usesOf(plan)).toEqual([
        ['Earthly Star', -7500],
        ['Stellar Detonation', 2500],
      ]);
      expect(plan.hits[1]).toMatchObject({ hpBefore: 87_000, safe: true });
    });
  });

  it('sets Macrocosmos off with Microcosmos once the hit it gathers is in, where its 15s are too long', () => {
    // The tank lands on 15,000 after a buster at 5s and needs 70,000 by
    // the next, at 9s: Macrocosmos up before the first heals 20,000 and
    // half of its 85,000, but on its own only 15s after the pull at the
    // soonest.
    const cat = catalog();
    cat.actions.push(
      action(
        25874,
        'Macrocosmos',
        ['SCH'],
        180,
        [
          {
            ...heal(200),
            kind: 'delayedHeal',
            target: 'party',
            status: 'Macrocosmos',
            durationMs: 15_000,
            condition: 'plus 50% of damage taken meanwhile; when it ends or on Microcosmos',
          },
        ],
        { gcd: true },
      ),
    );
    const timeline = pull(
      [
        [5, 'Buster', 1, 85_000],
        [9, 'Buster', 1, 60_000],
      ],
      [[1, 2, 189, 60_000]],
    );
    const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp as number]));
    const power = healPower(timeline, cat);
    const heals = healTools(timeline.players, cat, [], power).filter((t) => t.name === 'Macrocosmos');
    const options = { margin: 0.1 };

    const plan = planHeals(
      planMitigation(mechanicsOf(timeline), [], maxHp, options),
      timeline,
      [],
      heals,
      maxHp,
      options,
    );
    const at = (name: string) => plan.uses.find((u) => u.name === name)?.at ?? NaN;
    expect(at('Macrocosmos')).toBeGreaterThanOrEqual(0);
    expect(at('Macrocosmos')).toBeLessThan(5_000);
    expect(at('Microcosmos')).toBeGreaterThan(5_000);
    expect(at('Microcosmos')).toBeLessThan(9_000);
    expect(plan.hits[1]).toMatchObject({ safe: true });
  });

  it('puts Excogitation up before a hit that takes its target to half HP, healing them for the next', () => {
    const cat = catalog();
    cat.actions.push(
      action(7434, 'Excogitation', ['SCH'], 45, [
        {
          ...heal(800),
          kind: 'delayedHeal',
          status: 'Excogitation',
          durationMs: 45_000,
          condition: 'at 50% HP or below, or when it ends',
        },
      ]),
    );
    // The first buster leaves the tank on 15,000: Excogitation, up before
    // it, heals 80,000 right after.
    const timeline = pull(
      [
        [30, 'Buster', 1, 85_000],
        [40, 'Buster', 1, 60_000],
      ],
      [[1, 2, 189, 60_000]],
    );
    const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp as number]));
    const power = healPower(timeline, cat);
    const heals = healTools(timeline.players, cat, [], power).filter((t) => t.name === 'Excogitation');
    const options = { margin: 0.1 };

    const plan = planHeals(
      planMitigation(mechanicsOf(timeline), [], maxHp, options),
      timeline,
      [],
      heals,
      maxHp,
      options,
    );

    expect(plan.uses).toEqual([expect.objectContaining({ name: 'Excogitation', at: 29_500, target: 1, covers: [1] })]);
    expect(plan.hits[1]).toMatchObject({ hpBefore: 95_000, safe: true });
  });
});
