import { action, catalog, party } from './scheduler-fixtures';
import { mitigationTools } from './tools';

describe('mitigationTools', () => {
  it("gives each player their jobs' mitigations, not other actions", () => {
    const tools = mitigationTools(party(), catalog());

    expect(tools.map((t) => [t.player, t.name])).toEqual([
      [1, 'Guardian'],
      [1, 'Rampart'],
      [1, 'Reprisal'],
      [2, 'Sacred Soil'],
      [3, 'Troubadour'],
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
    expect(troubadour?.effects[0]).toMatchObject({
      status: 'Troubadour',
      stack: 'ranged party mitigation',
      share: 0.15,
    });
  });

  it('takes the smaller share where physical and magic differ, and leaves out conditional effects', () => {
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

    expect(tools.map((t) => [t.name, t.effects.map((e) => e.share)])).toEqual([['Dark Missionary', [0.05]]]);
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
