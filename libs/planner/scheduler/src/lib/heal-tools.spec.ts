import { ActionCatalog } from '@everise/core/api-types';
import { healPairings, healTools } from './heal-tools';
import { action, catalog, heal, party } from './scheduler-fixtures';
import { mitigationTools } from './tools';

describe('healTools', () => {
  const power = new Map([
    [1, 50],
    [2, 100],
  ]);
  const withHeals = (): ActionCatalog => {
    const base = catalog();
    const regen = {
      ...heal(100),
      kind: 'regen' as const,
      target: 'party' as const,
      status: 'Whispering Dawn',
      statusId: 315,
      durationMs: 21_000,
    };
    return {
      ...base,
      actions: [
        ...base.actions,
        action(16537, 'Whispering Dawn', ['SCH'], 60, [regen]),
        action(140, 'Benediction', ['SCH'], 180, [{ ...heal(0), potency: null, percent: 100, of: 'maxHp' }]),
        action(3541, 'Clemency', ['PLD'], 2.5, [heal(1000)], { gcd: true }),
        action(24285, 'Kardia', ['SCH'], 5, [{ ...heal(170), condition: "each of the sage's damage spells" }]),
      ],
    };
  };
  const tools = () => {
    const c = withHeals();
    return healTools(party(), c, mitigationTools(party(), c, power), power);
  };

  it('holds a Fey Union for 4 ticks, from the Faerie Gauge', () => {
    const union = {
      ...heal(300),
      kind: 'regen' as const,
      status: 'Fey Union',
      condition: 'while held, using the Faerie Gauge',
    };
    const cat = { ...catalog(), actions: [action(7437, 'Aetherpact', ['SCH'], 3, [union])] };

    const [aetherpact] = healTools(party(), cat, [], power);

    expect(aetherpact.effects).toEqual([expect.objectContaining({ ticks: 4, size: { hp: 30_000 } })]);
    expect(aetherpact.pool).toEqual({ name: 'Faerie Gauge', gainMs: 75_000, max: 2 });
  });

  it("sizes the healers' heals from their power, and healing over time a tick every 3 seconds", () => {
    const byName = new Map(tools().map((t) => [t.name, t]));

    expect(byName.get('Lustrate')?.effects).toEqual([
      { target: 'target', size: { hp: 60_000 }, ticks: 1, status: null, statusId: null },
    ]);
    expect(byName.get('Physick')).toMatchObject({ gcd: true, castMs: 1500 });
    expect(byName.get('Whispering Dawn')?.effects).toEqual([
      { target: 'party', size: { hp: 10_000 }, ticks: 7, status: 'Whispering Dawn', statusId: 315 },
    ]);
    expect(byName.get('Benediction')?.effects[0].size).toEqual({ maxHpShare: 1 });
    expect(byName.get('Lustrate')?.pool?.name).toBe('Aetherflow');
  });

  it("leaves out everyone else's heals but the mitigations'", () => {
    const names = tools().map((t) => t.name);

    expect(names).not.toContain('Clemency');
    // Adloquium is a shield the plan uses, and heals too.
    expect(names).toContain('Adloquium');
  });

  it("has Kardia moved heal another member for the sage's next four damage spells", () => {
    const kardia = tools().find((t) => t.name === 'Kardia');

    expect(kardia?.effects).toEqual([
      { target: 'target', size: { hp: 17_000 }, ticks: 4, status: 'Kardion', statusId: null },
    ]);
  });

  it("counts a DPS's heals that cost no damage (Second Wind), not a tank's", () => {
    const c = catalog();
    c.actions.push(action(7541, 'Second Wind', ['BRD', 'PLD'], 120, [{ ...heal(800), target: 'self' }]));

    const own = healTools(
      party(),
      c,
      [],
      new Map([
        [1, 50],
        [3, 20],
      ]),
    ).filter((t) => t.name === 'Second Wind');

    expect(own.map((t) => [t.player, t.cost, t.effects[0].size])).toEqual([[3, 'free', { hp: 16_000 }]]);
  });

  it('counts the grown Earthly Star as a delayed heal, set off by Stellar Detonation', () => {
    const c = withHeals();
    c.actions.push(
      action(7439, 'Earthly Star', ['SCH'], 60, [
        { ...heal(720), target: 'party', condition: 'after 10s; 540 if detonated earlier' },
      ]),
      action(8324, 'Stellar Detonation', ['SCH'], 1, [
        { ...heal(540), target: 'party', condition: '720 once the star has grown (10s)' },
      ]),
    );
    const byName = new Map(healTools(party(), c, [], power).map((t) => [t.name, t]));

    expect(byName.get('Earthly Star')).toMatchObject({
      effects: [{ target: 'party', size: { hp: 72_000 } }],
      delayed: {
        delaysMs: [20_000, 10_000],
        release: { action: 8324, name: 'Stellar Detonation' },
        loggedAs: 'Stellar Explosion',
      },
    });
    expect(byName.get('Lustrate')?.delayed).toBeNull();
    // Only with a star out: never a heal of its own.
    expect(byName.has('Stellar Detonation')).toBe(false);
  });

  it('reads the heals that wait for half HP or their end from their condition', () => {
    const waiting = (status: string, potency: number, seconds: number, condition: string) => ({
      ...heal(potency),
      kind: 'delayedHeal' as const,
      status,
      durationMs: seconds * 1000,
      condition,
    });
    const c = withHeals();
    c.actions.push(
      action(7434, 'Excogitation', ['SCH'], 45, [
        waiting('Excogitation', 800, 45, 'at 50% HP or below, or when it ends'),
      ]),
      action(25873, 'Exaltation', ['SCH'], 60, [waiting('Exaltation', 500, 8, 'when it ends')]),
      action(16557, 'Horoscope', ['SCH'], 60, [
        waiting('Horoscope', 200, 10, '400 (and 30s) after a Helios; when read again or it ends'),
      ]),
      action(25874, 'Macrocosmos', ['SCH'], 180, [
        waiting('Macrocosmos', 200, 15, 'plus 50% of damage taken meanwhile; when it ends or on Microcosmos'),
      ]),
      // A condition the plan can't count.
      action(1, 'Riddle', ['SCH'], 60, [waiting('Riddle', 100, 10, 'when someone guesses it')]),
    );
    const byName = new Map(healTools(party(), c, [], power).map((t) => [t.name, t]));

    expect(byName.get('Excogitation')).toMatchObject({
      effects: [{ target: 'target', size: { hp: 80_000 } }],
      pool: { name: 'Aetherflow' },
      delayed: { delaysMs: [45_000], release: null, belowShare: 0.5, loggedAs: 'Excogitation' },
    });
    expect(byName.get('Exaltation')?.delayed).toMatchObject({ delaysMs: [8000], belowShare: null });
    expect(byName.get('Horoscope')?.delayed).toMatchObject({ delaysMs: [10_000], belowShare: null, damageShare: null });
    // Set off sooner with Microcosmos, once the hits it gathers are in.
    expect(byName.get('Macrocosmos')?.delayed).toMatchObject({
      delaysMs: [15_000, 10_000, 5_000, 2_500],
      release: { action: 25875, name: 'Microcosmos' },
      damageShare: 0.5,
    });
    expect(byName.has('Riddle')).toBe(false);
  });

  it('heals for the stacks left: by barrier, or by the white mage taking damage', () => {
    const left = (potency: number) => ({
      ...heal(potency),
      kind: 'delayedHeal' as const,
      condition: 'each stack left when it ends',
    });
    const c = withHeals();
    c.actions.push(
      action(24305, 'Haima', ['SCH'], 120, [
        {
          ...heal(0),
          kind: 'shield',
          status: 'Haima',
          potency: 300,
          stacks: 5,
          durationMs: 15_000,
          condition: 'renewed each time it breaks',
        },
        { ...left(150), status: 'Haima' },
      ]),
      action(25862, 'Liturgy of the Bell', ['SCH'], 180, [
        {
          ...heal(400),
          target: 'party',
          stacks: 5,
          durationMs: 20_000,
          condition: 'each time the white mage takes damage',
        },
        { ...left(200), target: 'party', status: 'Liturgy of the Bell' },
      ]),
    );
    const byName = new Map(healTools(party(), c, [], power).map((t) => [t.name, t]));

    expect(byName.get('Haima')).toMatchObject({
      effects: [{ target: 'target', size: { hp: 15_000 } }],
      delayed: { delaysMs: [15_000], stacks: { count: 5, holder: 'target', perHit: null } },
    });
    expect(byName.get('Liturgy of the Bell')).toMatchObject({
      effects: [{ target: 'party', size: { hp: 20_000 } }],
      delayed: { delaysMs: [20_000], stacks: { count: 5, holder: 'self', perHit: { hp: 40_000 } } },
    });
  });
});

describe('healPairings', () => {
  it("makes Recitation's heal critical, from the healer's critical hit", () => {
    const cat = catalog();
    cat.actions.push(action(16542, 'Recitation', ['SCH'], 90, []));
    const players = party();
    const recitation = (critical: number | null) =>
      healPairings(
        players.map((p) => (p.id === 2 && critical ? { ...p, stats: { ...stats(), criticalHit: critical } } : p)),
        cat,
        new Map([[2, 100]]),
      ).find((p) => p.name === 'Recitation');

    // 1.4 and a thousandth every 13.9 points over 420.
    expect(recitation(3413)?.times).toBeCloseTo(1.615);
    // The log doesn't say: 1.5.
    expect(recitation(null)?.times).toBe(1.5);
    expect(recitation(null)?.heals).toEqual([185, 37013, 3583, 7434]);
  });

  it("has Emergency Tactics turn a scholar's Galvanize into healing", () => {
    const cat = catalog();
    cat.actions.push(
      action(3586, 'Emergency Tactics', ['SCH'], 15, []),
      action(37037, 'Emergency Tactics', ['SCH'], 1, []),
    );

    const [tactics, underSeraphism] = healPairings(party(), cat, new Map([[2, 100]])).filter(
      (p) => p.name === 'Emergency Tactics',
    );

    // The heal and its 180% barrier, all healing, and no barrier; under
    // Seraphism (1s), its Manifestation's and Accession's.
    expect(tactics).toMatchObject({ recastMs: 15_000, times: 2.8, converts: true, heals: [185, 37013] });
    expect(underSeraphism).toMatchObject({ recastMs: 1000, times: 2.8, converts: true, heals: [37015, 37016] });
  });

  it("has Synastry's bond add 40% to an astrologian's heal on one member", () => {
    const cat = catalog();
    cat.actions.push(action(3612, 'Synastry', ['SCH'], 120, []));

    const synastry = healPairings(party(), cat, new Map([[2, 100]])).find((p) => p.name === 'Synastry');

    expect(synastry).toMatchObject({ times: 1.4, onTarget: true, withinMs: 20_000, heals: [3594, 3610, 3595] });
  });
});

describe('Soteria', () => {
  it("heals 119 potency more on each of the sage's next four Kardion heals", () => {
    const cat = catalog();
    cat.actions.push(action(24294, 'Soteria', ['SCH'], 60, []));

    const soteria = healTools(party(), cat, [], new Map([[2, 100]])).find((t) => t.name === 'Soteria');

    expect(soteria?.effects).toEqual([
      { target: 'target', size: { hp: 11_900 }, ticks: 4, status: 'Soteria', statusId: null },
    ]);
  });
});

function stats() {
  return {
    level: 100,
    strength: 0,
    dexterity: 0,
    vitality: 0,
    intelligence: 0,
    mind: 0,
    piety: 0,
    determination: 0,
    criticalHit: 0,
    directHit: 0,
    skillSpeed: 0,
    spellSpeed: 0,
    tenacity: 0,
  };
}
