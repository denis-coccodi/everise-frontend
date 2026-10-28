import { ActionCatalog, ActionEffect, CatalogAction, PullTimeline } from '@everise/core/api-types';

// A party of a paladin (1), a scholar (2) and a bard (3), facing tank
// busters and raidwides.
export function party(): PullTimeline['players'] {
  const player = (id: number, job: string, role: 'tank' | 'healer' | 'ranged') => ({
    id,
    name: `${job} Main`,
    job,
    role,
    maxHp: 100_000,
    maxMp: null,
    mp: [],
    stats: null,
  });
  return [player(1, 'PLD', 'tank'), player(2, 'SCH', 'healer'), player(3, 'BRD', 'ranged')];
}

const mitigation = (
  target: ActionEffect['target'],
  status: string,
  percent: number,
  seconds: number,
): ActionEffect => ({
  kind: 'mitigation',
  target,
  status,
  statusId: null,
  percent,
  physical: null,
  magic: null,
  potency: null,
  of: null,
  durationMs: seconds * 1000,
  stacks: null,
  condition: null,
});

export const heal = (potency: number): ActionEffect => ({
  ...mitigation('target', '', 0, 0),
  kind: 'heal',
  status: null,
  percent: null,
  potency,
  durationMs: null,
});

const shield = (
  target: ActionEffect['target'],
  status: string,
  seconds: number,
  size: Partial<ActionEffect>,
): ActionEffect => ({ ...mitigation(target, status, 0, seconds), kind: 'shield', percent: null, ...size });

export function action(
  id: number,
  name: string,
  jobs: string[],
  recastS: number,
  effects: ActionEffect[],
  extra: Partial<CatalogAction> = {},
): CatalogAction {
  return {
    id,
    name,
    icon: null,
    description: null,
    jobs,
    level: 50,
    gcd: false,
    castMs: 0,
    recastMs: recastS * 1000,
    charges: 1,
    mpCost: 0,
    cooldownGroup: id,
    range: 0,
    radius: 0,
    effects,
    traits: [],
    ...extra,
  };
}

// Their mitigations, as the catalog gives them (shortened).
export function catalog(): ActionCatalog {
  return {
    dataVersion: 'test',
    builtAt: '2026-10-21T12:00:00.000Z',
    changed: [],
    actions: [
      action(17, 'Sentinel', ['PLD'], 120, [mitigation('self', 'Sentinel', 30, 15)], { level: 38 }),
      action(36920, 'Guardian', ['PLD'], 120, [mitigation('self', 'Guardian', 40, 15)], { level: 92 }),
      action(7531, 'Rampart', ['PLD', 'WAR'], 90, [mitigation('self', 'Rampart', 20, 20)]),
      action(7535, 'Reprisal', ['PLD', 'WAR'], 60, [mitigation('enemies', 'Reprisal', 10, 15)]),
      action(188, 'Sacred Soil', ['SCH'], 30, [mitigation('party', 'Sacred Soil', 10, 15)]),
      action(7405, 'Troubadour', ['BRD'], 90, [mitigation('party', 'Troubadour', 15, 15)]),
      action(16889, 'Tactician', ['MCH'], 90, [mitigation('party', 'Tactician', 15, 15)]),
      action(189, 'Lustrate', ['SCH'], 1, [heal(600)]),
      action(190, 'Physick', ['SCH'], 2.5, [heal(450)], { gcd: true, castMs: 1500 }),
      action(
        185,
        'Adloquium',
        ['SCH'],
        2.5,
        [heal(300), shield('target', 'Galvanize', 30, { percent: 180, of: 'healed' })],
        {
          gcd: true,
        },
      ),
      action(3540, 'Divine Veil', ['PLD'], 90, [
        shield('party', 'Divine Veil', 30, { percent: 10, of: 'casterMaxHp' }),
      ]),
      action(9, 'Fast Blade', ['PLD'], 2.5, [], { gcd: true }),
    ],
  };
}

// A pull of those players with these hits ([time in s, attack, target,
// unmitigated damage]) and heals ([time in s, healer, action, HP]).
export function pull(
  hits: [number, string, number, number][],
  heals: [number, number, number, number][] = [],
): PullTimeline {
  const names = [...new Set(hits.map((h) => h[1]))];
  return {
    code: 'aBcD1234eFgH5678',
    pullId: 3,
    startedAt: '2026-10-20T19:03:00.000Z',
    durationMs: 600_000,
    players: party(),
    enemies: [{ id: 13, name: 'Boss', boss: true }],
    actions: names.map((name, i) => ({ id: 100 + i, name })),
    statuses: [],
    damage: hits.map(([at, name, target, unmitigated]) => ({
      at: at * 1000,
      target,
      source: 13,
      action: 100 + names.indexOf(name),
      amount: unmitigated,
      unmitigated,
      mitigated: 0,
      absorbed: 0,
      overkill: 0,
      multiplier: null,
      damageType: 'magic',
      tick: false,
      statuses: [],
      hp: null,
    })),
    heals: heals.map(([at, source, action, amount]) => ({
      at: at * 1000,
      source,
      pet: null,
      target: 1,
      action,
      status: null,
      amount,
      overheal: 0,
      tick: false,
      estimated: false,
      hp: null,
    })),
    absorbs: [],
    // The scholar's Aetherflow, on cooldown from the pull: 3 stacks a minute.
    playerCasts: Array.from({ length: 10 }, (_, i) => ({
      at: i * 60_000,
      source: 2,
      target: null,
      action: 166,
      castMs: null,
    })),
    enemyCasts: [],
    auras: [],
    deaths: [],
  };
}
