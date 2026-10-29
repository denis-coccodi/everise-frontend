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

    const notAttacks = log.filter((e) => e.kind === 'use' && !e.attack);
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
