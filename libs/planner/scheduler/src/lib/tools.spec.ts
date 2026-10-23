import { action, catalog, party } from './scheduler-fixtures';
import { POOLS, mitigationTools } from './tools';

describe('mitigationTools', () => {
  it("gives each player their jobs' mitigations and shields, not other actions", () => {
    const tools = mitigationTools(party(), catalog());

    // Adloquium's shield is a share of its heal: without the scholar's heal
    // power it can't be sized, so it's left out.
    expect(tools.map((t) => [t.player, t.name])).toEqual([
      [1, 'Guardian'],
      [1, 'Rampart'],
      [1, 'Reprisal'],
      [1, 'Divine Veil'],
      [2, 'Sacred Soil'],
      [3, 'Troubadour'],
    ]);
  });

  it("sizes shields from the caster's heal power or max HP, and marks GCDs", () => {
    const tools = mitigationTools(party(), catalog(), new Map([[2, 100]]));
    const adloquium = tools.find((t) => t.name === 'Adloquium');
    const veil = tools.find((t) => t.name === 'Divine Veil');

    // 300 potency × 100 HP a potency × 180%.
    expect(adloquium?.effects).toEqual([
      expect.objectContaining({
        target: 'target',
        physical: 0,
        magic: 0,
        shield: { hp: 54_000 },
        hits: 1,
        status: 'Galvanize',
      }),
    ]);
    expect(adloquium?.gcd).toBe(true);
    // 10% of the paladin's 100,000 HP.
    expect(veil?.effects).toEqual([expect.objectContaining({ target: 'party', shield: { hp: 10_000 } })]);
    expect(veil?.gcd).toBe(false);
  });

  it("counts Panhaima's barrier, renewed as each breaks, as a shield on each of its stacks' hits", () => {
    const cat = catalog();
    const barrier = {
      ...(cat.actions.find((a) => a.name === 'Divine Veil')
        ?.effects[0] as (typeof cat.actions)[number]['effects'][number]),
      status: 'Panhaima',
      of: null,
      percent: null,
      potency: 200,
      durationMs: 15_000,
      stacks: 5,
      condition: 'renewed each time it breaks',
    };
    cat.actions.push(action(24311, 'Panhaima', ['SCH'], 120, [barrier]));

    const panhaima = mitigationTools(party(), cat, new Map([[2, 100]])).find((t) => t.name === 'Panhaima');

    expect(panhaima?.effects).toEqual([
      expect.objectContaining({ target: 'party', shield: { hp: 20_000 }, hits: 5, status: 'Panhaima' }),
    ]);
  });

  it('keeps what a trait replaces only below the level it does', () => {
    const players = party().map((p) => ({ ...p, stats: p.job === 'PLD' ? { ...stats(), level: 90 } : null }));

    const names = mitigationTools(players, catalog())
      .filter((t) => t.player === 1)
      .map((t) => t.name);

    expect(names).toContain('Sentinel');
    expect(names).not.toContain('Guardian');
  });

  it('counts what really limits gauge and card actions, and which statuses share a stack', () => {
    const tools = mitigationTools(party(), catalog());
    const soil = tools.find((t) => t.name === 'Sacred Soil');
    const troubadour = tools.find((t) => t.name === 'Troubadour');

    expect(soil?.pool).toEqual({ name: 'Aetherflow', gainMs: 20_000, max: 3 });
    // An astrologian's card comes every other draw: every 110s, each its own.
    expect(POOLS[37027]).toEqual({ name: 'the Bole', gainMs: 110_000, max: 1 });
    expect(POOLS[37024]).toEqual({ name: 'the Arrow', gainMs: 110_000, max: 1 });
    expect(troubadour?.effects[0]).toMatchObject({
      status: 'Troubadour',
      stack: 'ranged party mitigation',
      physical: 0.15,
      magic: 0.15,
    });
  });

  it('keeps the physical and magic shares apart, and leaves out conditional effects', () => {
    const effect = {
      kind: 'mitigation' as const,
      target: 'party' as const,
      statusId: null,
      percent: null,
      potency: null,
      of: null,
      stacks: null,
      durationMs: 15_000,
    };
    const tools = mitigationTools(party(), {
      ...catalog(),
      actions: [
        action(16471, 'Dark Missionary', ['PLD'], 90, [
          { ...effect, status: 'Dark Missionary', physical: 5, magic: 10, condition: null },
        ]),
        action(7498, 'Third Eye', ['PLD'], 15, [
          { ...effect, status: 'Third Eye', physical: null, magic: null, percent: 10, condition: 'next attack' },
        ]),
      ],
    });

    expect(tools.map((t) => [t.name, t.effects.map((e) => [e.physical, e.magic])])).toEqual([
      ['Dark Missionary', [[0.05, 0.1]]],
    ]);
  });

  it('knows what each invulnerability does', () => {
    const invulnerable = (id: number, name: string, condition: string | null = null) =>
      action(id, name, ['PLD'], 300, [
        {
          kind: 'invulnerable',
          target: 'self',
          status: name,
          statusId: null,
          percent: null,
          physical: null,
          magic: null,
          potency: null,
          of: null,
          stacks: null,
          durationMs: 10_000,
          condition,
        },
      ]);
    const tools = mitigationTools(party(), {
      ...catalog(),
      actions: [
        invulnerable(30, 'Hallowed Ground'),
        invulnerable(43, 'Holmgang'),
        invulnerable(16152, 'Superbolide'),
        invulnerable(3638, 'Living Dead', 'healed back to full HP within 10s, or KO'),
      ],
    });

    expect(tools.map((t) => [t.name, t.effects.map((e) => e.invulnerable)])).toEqual([
      ['Hallowed Ground', ['immune']],
      ['Holmgang', ['lastHp']],
      ['Superbolide', ['halvesHp']],
      ['Living Dead', ['walkingDead']],
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
