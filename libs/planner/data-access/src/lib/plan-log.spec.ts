import type { Plan } from '@everise/planner/scheduler';
import { actionCatalog, pullTimeline } from './planner-fixtures';
import { planLog, unsafeHits } from './plan-log';

const plan: Plan = {
  mechanics: [
    { id: 0, at: 65_000, action: 45956, name: 'Killer Voice', kind: 'raidwide', damageType: 'magic', hits: [] },
    { id: 1, at: 200_000, action: 45956, name: 'Killer Voice', kind: 'raidwide', damageType: 'magic', hits: [] },
  ],
  uses: [
    { player: 1, action: 7535, name: 'Reprisal', at: 64_500, target: null, covers: [0] },
    { player: 1, action: 7382, name: 'Intervention', at: 199_500, target: 2, covers: [1] },
  ],
  hits: [
    {
      mechanic: 0,
      player: 2,
      unmitigated: 100_000,
      planned: 90_000,
      asPlayed: 40_000,
      absorbed: 0,
      hpBefore: 180_000,
      share: 0.45,
      safe: true,
      invulnerable: false,
      avoidable: false,
      covers: ['Reprisal'],
    },
    {
      mechanic: 1,
      player: 2,
      unmitigated: 210_000,
      planned: 189_000,
      asPlayed: 210_000,
      absorbed: 5_000,
      hpBefore: 200_000,
      share: 0.945,
      safe: false,
      invulnerable: false,
      avoidable: false,
      covers: ['Intervention'],
    },
  ],
  unplaced: [],
  hp: [],
};

describe('planLog', () => {
  it("gives a player's hits as the plan leaves them, and their HP before and after", () => {
    expect(planLog(plan, pullTimeline(), 2)).toEqual([
      {
        kind: 'hit',
        at: 65_000,
        action: 'Killer Voice',
        unmitigated: 100_000,
        planned: 90_000,
        asPlayed: 40_000,
        absorbed: 0,
        share: 0.45,
        before: 0.9,
        after: 0.45,
        safe: true,
        avoidable: false,
        covers: ['Reprisal'],
        severity: { tier: 'moderate', kind: 'raidwide', share: 0.5, damageType: 'magic' },
      },
      expect.objectContaining({ kind: 'hit', at: 200_000, safe: false }),
    ]);
  });

  it("shows a replanned player's attacks as played, so their whole rotation is there", () => {
    // Their Fast Blade at 62s, before the Reprisal at 64.5s.
    const catalog = actionCatalog();
    for (const a of catalog.actions) if (a.id === 9) a.gcd = true;

    expect(planLog({ ...plan, replanned: [1] }, pullTimeline(), 1, catalog).slice(0, 2)).toEqual([
      expect.objectContaining({
        kind: 'use',
        at: 62_000,
        action: 'Fast Blade',
        kept: 'Damage',
        attack: true,
        gcd: true,
      }),
      expect.objectContaining({ kind: 'use', action: 'Reprisal' }),
    ]);
  });

  it('gives their usual attack in the slot of a GCD heal the plan has no use for, and none where it has its own', () => {
    const catalog = actionCatalog();
    for (const a of catalog.actions) if (a.id === 9 || a.name === 'Adloquium') a.gcd = true;
    const timeline = pullTimeline();
    // Adloquium (player 2's GCD heal) at 30s and 40s; Fast Blade, their attack, at 35s.
    const adlo = timeline.playerCasts[3].action;
    timeline.playerCasts = [30_000, 35_000, 40_000].map((at) => ({
      at,
      source: 2,
      target: null,
      action: at === 35_000 ? 9 : adlo,
      castMs: null,
    }));
    const own = { ...plan.uses[0], player: 2, action: adlo, name: 'Adloquium', at: 40_000 };

    const log = planLog({ ...plan, uses: [own], replanned: [2] }, timeline, 2, catalog);

    expect(log.filter((e) => e.kind === 'use').map((e) => e.kind === 'use' && [e.at, e.action, e.instead])).toEqual([
      [30_000, 'Fast Blade', 'Adloquium'],
      [35_000, 'Fast Blade', undefined],
      [40_000, 'Adloquium', undefined],
    ]);
  });

  it("gives their usual attack in the slot of what their burst enabled that the plan's doesn't", () => {
    const catalog = actionCatalog();
    for (const a of catalog.actions) if (a.id === 9) a.gcd = true;
    const scarlet = { ...catalog.actions.find((a) => a.id === 9)!, id: 36928, name: 'Scarlet Delirium' };
    catalog.actions.push(scarlet);
    const timeline = pullTimeline();
    // Fast Blade at 30s and 32.5s; Scarlet Delirium, after their Delirium, at 35s and 37.5s: the plan kept the one at 37.5s
    // (its Delirium moved) and dropped the one at 35s.
    timeline.playerCasts = [30_000, 32_500, 35_000, 37_500].map((at) => ({
      at,
      source: 2,
      target: null,
      action: at < 35_000 ? 9 : 36928,
      castMs: null,
    }));
    const kept = { ...plan.uses[0], player: 2, action: 36928, name: 'Scarlet Delirium', at: 37_500, burst: true };

    const log = planLog({ ...plan, uses: [kept], replanned: [2] }, timeline, 2, catalog);

    expect(log.filter((e) => e.kind === 'use').map((e) => e.kind === 'use' && [e.at, e.action, e.instead])).toEqual([
      [30_000, 'Fast Blade', undefined],
      [32_500, 'Fast Blade', undefined],
      [35_000, 'Fast Blade', 'Scarlet Delirium'],
      [37_500, 'Scarlet Delirium', undefined],
    ]);
  });

  it('gives their usual attack in the slot of an attack the plan places itself, and of a Dosis whose Eukrasia it took', () => {
    const catalog = actionCatalog();
    for (const a of catalog.actions) if (a.id === 9) a.gcd = true;
    const blade = catalog.actions.find((a) => a.id === 9)!;
    catalog.actions.push(
      { ...blade, id: 16535, name: 'Afflatus Misery' },
      { ...blade, id: 24290, name: 'Eukrasia', description: 'Augments certain offensive and healing magic actions.' },
      { ...blade, id: 24314, name: 'Eukrasian Dosis III' },
    );
    const timeline = pullTimeline();
    // Afflatus Misery at 30s; Eukrasia at 40s and 45s, each with its Eukrasian Dosis III a second later; Fast Blade,
    // their usual attack, from 50s.
    const casts: [number, number][] = [
      [30_000, 16535],
      [40_000, 24290],
      [41_000, 24314],
      [45_000, 24290],
      [46_000, 24314],
      [50_000, 9],
      [52_500, 9],
      [55_000, 9],
    ];
    timeline.playerCasts = casts.map(([at, action]) => ({ at, source: 2, target: null, action, castMs: null }));
    // The plan's own Misery at 60s, and a GCD of its own in the slot of the Eukrasia at 40s.
    const use = (action: number, name: string, at: number, extra = {}) => ({
      ...plan.uses[0],
      player: 2,
      action,
      name,
      at,
      ...extra,
    });
    const uses = [use(16535, 'Afflatus Misery', 60_000, { damage: true }), use(9, 'Fast Blade', 40_000)];

    const log = planLog({ ...plan, uses, replanned: [2] }, timeline, 2, catalog);

    expect(
      log.filter((e) => e.kind === 'use' && e.kept).map((e) => e.kind === 'use' && [e.at, e.action, e.instead]),
    ).toEqual([
      [30_000, 'Fast Blade', 'Afflatus Misery'],
      [41_000, 'Fast Blade', 'Eukrasian Dosis III'],
      [45_000, 'Eukrasia', undefined],
      [46_000, 'Eukrasian Dosis III', undefined],
      [50_000, 'Fast Blade', undefined],
      [52_500, 'Fast Blade', undefined],
      [55_000, 'Fast Blade', undefined],
    ]);
  });

  it("keeps their oGCD attacks in the opener but for its own and those in its steps' weave slots", () => {
    const catalog = actionCatalog();
    const blade = catalog.actions.find((a) => a.id === 9)!;
    catalog.actions.push({ ...blade, id: 36921, name: 'Imperator', gcd: false });
    const timeline = pullTimeline();
    // Imperator at 8.2s, the weave after their Fight or Flight; another at 7.7s, in its slot.
    timeline.playerCasts = [7_700, 8_200].map((at) => ({ at, source: 2, target: null, action: 36921, castMs: null }));
    const fof = { ...plan.uses[0], player: 2, action: 20, name: 'Fight or Flight', at: 7_600, opener: true };

    const log = planLog({ ...plan, uses: [fof], replanned: [2] }, timeline, 2, catalog);

    expect(log.filter((e) => e.kind === 'use' && e.kept).map((e) => e.at)).toEqual([8_200]);
  });

  it("gives a replanned tank's spends the gauge pays for, and their spender in a stand-in's place where it does", () => {
    const catalog = actionCatalog();
    const gcd = (id: number, name: string, description: string) => ({
      ...catalog.actions[0],
      id,
      name,
      jobs: ['WAR'],
      gcd: true,
      effects: [],
      description,
    });
    catalog.actions.push(
      gcd(31, 'Heavy Swing', 'Delivers an attack with a potency of 220.'),
      gcd(3549, 'Fell Cleave', 'Delivers an attack with a potency of 580.\nBeast Gauge Cost: 50'),
      gcd(16465, 'Inner Chaos', 'Delivers a critical direct hit with a potency of 700.\nBeast Gauge Cost: 50'),
      gcd(25753, 'Primal Rend', 'Delivers a critical direct hit with a potency of 720.'),
      { ...gcd(52, 'Infuriate', 'Increases Beast Gauge by 50.'), gcd: false },
    );
    const timeline = pullTimeline();
    timeline.players[0].job = 'WAR';
    // Heavy Swings, a Fell Cleave at 17.5s (paid with the 50 they had), and a Primal Rend at 30s.
    const casts: [number, number][] = [
      [10_000, 31],
      [12_500, 31],
      [15_000, 31],
      [17_500, 3549],
      [30_000, 25753],
    ];
    timeline.playerCasts = casts.map(([at, action]) => ({ at, source: 1, target: null, action, castMs: null }));
    // The plan's own Inner Chaos at 20s takes those 50; its Infuriate at 28s gives 50 for the slot of their Primal Rend,
    // which no Inner Release of the plan's enables.
    const use = (action: number, name: string, at: number) => ({ ...plan.uses[0], player: 1, action, name, at });
    const uses = [use(16465, 'Inner Chaos', 20_000), use(52, 'Infuriate', 28_000)];

    const log = planLog({ ...plan, uses, replanned: [1] }, timeline, 1, catalog);

    expect(
      log.filter((e) => e.kind === 'use' && e.kept).map((e) => e.kind === 'use' && [e.at, e.action, e.instead]),
    ).toEqual([
      [10_000, 'Heavy Swing', undefined],
      [12_500, 'Heavy Swing', undefined],
      [15_000, 'Heavy Swing', undefined],
      [17_500, 'Heavy Swing', 'Fell Cleave'],
      [30_000, 'Fell Cleave', 'Primal Rend'],
    ]);
  });

  it("keeps a replanned scholar's Energy Drains as played only where the plan's heals left the stacks", () => {
    const timeline = pullTimeline();
    // Energy Drains at 15s, 25s and 50s.
    timeline.playerCasts = [15_000, 25_000, 50_000].map((at) => ({
      at,
      source: 2,
      target: null,
      action: 167,
      castMs: null,
    }));
    // The plan's Aetherflow at 10s; its Sacred Soil at 20s and Indomitability at 21s take two of the three stacks.
    const use = (action: number, name: string, at: number) => ({ ...plan.uses[0], player: 2, action, name, at });
    const uses = [use(166, 'Aetherflow', 10_000), use(188, 'Sacred Soil', 20_000), use(3583, 'Indomitability', 21_000)];

    const log = planLog({ ...plan, uses, replanned: [2] }, timeline, 2, actionCatalog());

    expect(log.filter((e) => e.kind === 'use' && e.attack).map((e) => e.at)).toEqual([15_000]);
  });

  it('keeps an attack that heals too as played, not as a dropped heal', () => {
    const catalog = actionCatalog();
    const blade = catalog.actions.find((a) => a.id === 9);
    const adlo = catalog.actions.find((a) => a.name === 'Adloquium');
    // Fast Blade made to heal its user, as Confiteor does.
    Object.assign(blade ?? {}, {
      gcd: true,
      effects: adlo?.effects.slice(0, 1) ?? [],
      description: 'Deals physical damage.',
    });

    const log = planLog({ ...plan, replanned: [1] }, pullTimeline(), 1, catalog);

    expect(log.find((e) => e.kind === 'use' && e.at === 62_000)).toEqual(
      expect.objectContaining({ action: 'Fast Blade', attack: true, kept: 'Damage' }),
    );
    expect(log.some((e) => e.kind === 'use' && e.instead)).toBe(false);
  });

  it('shows their first GCD when they cast it in the countdown', () => {
    // Landing at 0.8s, 1.5s before the next (their GCD: 2.3s).
    const catalog = actionCatalog();
    for (const a of catalog.actions) if (a.id === 9) a.gcd = true;
    const timeline = pullTimeline();
    timeline.playerCasts = [800, 2300, 4600, 6900].map((at) => ({
      at,
      source: 1,
      target: null,
      action: 9,
      castMs: null,
    }));

    for (const a of catalog.actions) if (a.id === 9) a.castMs = 1_500;

    // Its 1.5s cast began 0.7s before the pull.
    expect(planLog(plan, timeline, 1, catalog)[0]).toEqual(
      expect.objectContaining({ at: 800, action: 'Fast Blade', attack: true, castAt: -700 }),
    );
  });

  it("keeps a replanned player's buffs, potions and attacks as played, not their heals", () => {
    const catalog = actionCatalog();
    catalog.actions.push({
      ...catalog.actions[0],
      id: 7562,
      name: 'Lucid Dreaming',
      effects: [],
      description: 'Gradually restores MP.' + String.fromCharCode(10) + 'Duration: 21s',
    });
    catalog.actions.push({
      ...catalog.actions[0],
      id: 24290,
      name: 'Eukrasia',
      effects: [],
      description: 'Augments certain offensive and healing magic actions.',
    });
    const timeline = pullTimeline();
    timeline.actions.push({ id: 34603667, name: 'Grade 4 Gemdraught of Mind' });
    timeline.playerCasts.push(
      { at: 20_000, source: 1, target: null, action: 7562, castMs: null },
      { at: 21_000, source: 1, target: null, action: 34603667, castMs: null },
      { at: 22_000, source: 1, target: null, action: 24290, castMs: null },
    );

    const kept = (replanned?: number[]) =>
      planLog({ ...plan, replanned }, timeline, 1, catalog).filter((e) => e.kind === 'use' && e.kept);

    // Rampart (the plan has its own) isn't kept, nor Eukrasia, not before an
    // attack; Fast Blade is, as one.
    expect(kept([1]).map((e) => e.kind === 'use' && [e.at, e.action, e.kept, !!e.attack])).toEqual([
      [20_000, 'Lucid Dreaming', 'Gradually restores MP.', false],
      [21_000, 'Grade 4 Gemdraught of Mind', 'An item (a potion, an ether)', false],
      [62_000, 'Fast Blade', 'Damage', true],
    ]);
    // Not replanned: all of it, as they played, Rampart and their Reprisal
    // at 61s too (the fixture's at 64.5s is another).
    expect(kept([2]).map((e) => e.kind === 'use' && e.action)).toEqual([
      'Lucid Dreaming',
      'Grade 4 Gemdraught of Mind',
      'Eukrasia',
      'Rampart',
      'Reprisal',
      'Fast Blade',
    ]);
  });

  it("keeps none of a replanned player's uses of what the plan schedules for them", () => {
    const catalog = actionCatalog();
    catalog.actions.push({
      ...catalog.actions[0],
      id: 3612,
      name: 'Synastry',
      effects: [],
      description: 'Generate an aetheric bond.',
    });
    const timeline = pullTimeline();
    timeline.playerCasts.push({ at: 50_000, source: 1, target: null, action: 3612, castMs: null });

    const kept = (scheduled: string[]) =>
      planLog({ ...plan, replanned: [1], scheduled }, timeline, 1, catalog).filter(
        (e) => e.kind === 'use' && e.kept && !e.attack,
      );

    expect(kept([]).map((e) => e.at)).toEqual([50_000]);
    expect(kept(['1:3612'])).toEqual([]);
  });

  it('keeps none of what the plan places under another action of the same name (Horoscope read again)', () => {
    const catalog = actionCatalog();
    for (const [id, name] of [
      [16557, 'Horoscope'],
      [16558, 'Horoscope'],
    ] as const) {
      catalog.actions.push({
        ...catalog.actions[0],
        id,
        name,
        gcd: false,
        effects: [],
        description: 'Reads your fortune.',
      });
    }
    const timeline = pullTimeline();
    timeline.playerCasts.push({ at: 50_000, source: 1, target: null, action: 16558, castMs: null });

    const reads = (scheduled: string[]) =>
      planLog({ ...plan, replanned: [1], scheduled }, timeline, 1, catalog).filter(
        (e) => e.kind === 'use' && e.action === 'Horoscope',
      );

    expect(reads([]).map((e) => e.at)).toEqual([50_000]);
    expect(reads(['1:16557'])).toEqual([]);
  });

  it('keeps no played attack the plan places itself, as an oGCD (Lord of Crowns)', () => {
    const catalog = actionCatalog();
    catalog.actions.push({
      ...catalog.actions[0],
      id: 7444,
      name: 'Lord of Crowns',
      gcd: false,
      effects: [],
      description: 'Deals unaspected damage with a potency of 400 to all nearby enemies.',
    });
    const timeline = pullTimeline();
    timeline.playerCasts.push({ at: 50_000, source: 1, target: null, action: 7444, castMs: null });

    const lords = (scheduled: string[]) =>
      planLog({ ...plan, replanned: [1], scheduled }, timeline, 1, catalog).filter(
        (e) => e.kind === 'use' && e.action === 'Lord of Crowns',
      );

    // As played while the plan leaves it to them; none once the plan places its own.
    expect(lords([]).map((e) => e.kind === 'use' && [e.at, e.kept])).toEqual([[50_000, 'Damage']]);
    expect(lords(['1:7444'])).toEqual([]);
  });

  it('gives an event (Macrocosmos healing as it ends) nothing to remove: nobody presses it', () => {
    const event = { ...plan.uses[0], action: 25875, name: 'Microcosmos', covers: [], again: 'ends' as const };
    const [entry] = planLog({ ...plan, uses: [event] }, pullTimeline(), plan.uses[0].player, actionCatalog()).filter(
      (e) => e.kind === 'use' && e.action === 'Microcosmos',
    );

    expect(entry).toEqual(expect.objectContaining({ again: 'ends' }));
    expect(entry).not.toHaveProperty('id');
  });

  it('shows their usual attack in place of a played GCD attack the plan places itself (Macrocosmos)', () => {
    const catalog = actionCatalog();
    for (const a of catalog.actions) if (a.id === 9) a.gcd = true;
    catalog.actions.push({
      ...catalog.actions[0],
      id: 25874,
      name: 'Macrocosmos',
      gcd: true,
      effects: [{ ...catalog.actions[0].effects[0], kind: 'delayedHeal', target: 'party' }],
      description: 'Deals unaspected damage with a potency of 250 to target and all enemies nearby it.',
    });
    const timeline = pullTimeline();
    // Their Fast Blade at 35s and 45s, and Macrocosmos at 40s.
    timeline.playerCasts = [35_000, 40_000, 45_000].map((at) => ({
      at,
      source: 1,
      target: null,
      action: at === 40_000 ? 25874 : 9,
      castMs: null,
    }));

    const at40 = (scheduled: string[]) =>
      planLog({ ...plan, uses: [], replanned: [1], scheduled }, timeline, 1, catalog).find(
        (e) => e.kind === 'use' && e.at === 40_000,
      );

    // Left to them, it stays as played; placed by the plan (a 180s recast), their attack goes in its slot.
    expect(at40([])).toEqual(expect.objectContaining({ action: 'Macrocosmos', kept: 'Damage' }));
    expect(at40(['1:25874'])).toEqual(expect.objectContaining({ action: 'Fast Blade', instead: 'Macrocosmos' }));
  });

  it('shows a buff the plan has on cooldown as such, and none of its played uses', () => {
    const catalog = actionCatalog();
    catalog.actions.push({
      ...catalog.actions[0],
      id: 7436,
      name: 'Chain Stratagem',
      effects: [],
      description: 'Increases rate at which target takes critical hits by 10%.',
    });
    const timeline = pullTimeline();
    timeline.playerCasts.push({ at: 100_000, source: 1, target: null, action: 7436, castMs: null });
    const chain = {
      player: 1,
      action: 7436,
      name: 'Chain Stratagem',
      at: 130_000,
      target: null,
      covers: [],
      burst: true,
    };

    const log = planLog({ ...plan, uses: [chain], replanned: [1] }, timeline, 1, catalog);

    // Nor the stand-in GCD it's woven after.
    const notAttacks = log.filter((e) => e.kind === 'use' && !e.attack && !e.standIn);
    expect(notAttacks.map((e) => [e.at, e.kind === 'use' && (e.burst ?? e.kept)])).toEqual([[130_000, true]]);
  });

  it('names the target of a single-target use, themselves included', () => {
    const self = { ...plan, uses: [{ ...plan.uses[1], player: 2, target: 2 }] };

    expect(planLog(self, pullTimeline(), 2).find((e) => e.kind === 'use')).toEqual(
      expect.objectContaining({ target: 'Heal Main' }),
    );
  });

  it('gives what the plan has a player use, and who for, before the hits it covers', () => {
    expect(planLog(plan, pullTimeline(), 1)).toEqual([
      {
        kind: 'use',
        at: 64_500,
        action: 'Reprisal',
        // Its id, for the user to remove it.
        id: 7535,
        target: null,
        first: null,
        covers: ['Killer Voice'],
        damage: false,
        overcap: false,
      },
      {
        kind: 'use',
        at: 199_500,
        action: 'Intervention',
        id: 7382,
        target: 'Heal Main',
        first: null,
        covers: ['Killer Voice'],
        damage: false,
        overcap: false,
      },
    ]);
  });
});

describe('unsafeHits', () => {
  it("counts the hits short of the margin, the party's or one player's", () => {
    expect(unsafeHits(plan)).toBe(1);
    expect(unsafeHits(plan, 1)).toBe(0);
  });
});
