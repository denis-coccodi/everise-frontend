import { ActionCatalog, ActionEffect, FightReport, PullTimeline } from '@everise/core/api-types';

// Shaped like a real M9S report: two Savage pulls and an Extreme kill.
export function fightReport(): FightReport {
  const pull = (id: number, encounterId: number, name: string, kind: 'savage' | 'extreme', kill: boolean) => ({
    id,
    encounterId,
    name,
    kind,
    kill,
    startedAt: `2026-10-20T19:${String(id).padStart(2, '0')}:00.000Z`,
    durationMs: 300_000 + id * 1000,
    bossHpLeft: kill ? 0 : 23.46,
    fightLeft: kill ? 0 : 23.46,
    phase: null,
    playerIds: [1, 2],
  });
  return {
    code: 'aBcD1234eFgH5678',
    title: 'M9S prog',
    startedAt: '2026-10-20T19:00:00.000Z',
    endedAt: '2026-10-20T20:00:00.000Z',
    players: [
      { id: 1, name: 'Tank Main', server: 'Phoenix', job: 'PLD', role: 'tank' },
      { id: 2, name: 'Heal Main', server: 'Phoenix', job: 'SCH', role: 'healer' },
    ],
    pulls: [
      pull(2, 101, 'Vamp Fatale', 'savage', false),
      pull(4, 1083, 'Doomtrain', 'extreme', true),
      pull(3, 101, 'Vamp Fatale', 'savage', true),
    ],
    otherPulls: 1,
  };
}

const effect = (values: Partial<ActionEffect> & Pick<ActionEffect, 'kind' | 'target'>): ActionEffect => ({
  status: null,
  statusId: null,
  percent: null,
  physical: null,
  magic: null,
  potency: null,
  of: null,
  durationMs: null,
  stacks: null,
  condition: null,
  ...values,
});

export function actionCatalog(): ActionCatalog {
  const action = (id: number, name: string, effects: ActionEffect[]) => ({
    id,
    name,
    icon: 800,
    jobs: ['PLD'],
    level: 50,
    gcd: false,
    castMs: 0,
    recastMs: 60_000,
    charges: 1,
    cooldownGroup: id,
    range: 0,
    radius: 0,
    effects,
  });
  return {
    dataVersion: 'test',
    builtAt: '2026-10-21T12:00:00.000Z',
    changed: [],
    actions: [
      action(9, 'Fast Blade', []),
      action(7531, 'Rampart', [
        effect({
          kind: 'mitigation',
          target: 'self',
          status: 'Rampart',
          statusId: 1191,
          percent: 20,
          durationMs: 20_000,
        }),
        effect({
          kind: 'healingReceived',
          target: 'self',
          status: 'Rampart',
          statusId: 1191,
          percent: 15,
          durationMs: 20_000,
        }),
      ]),
      action(7535, 'Reprisal', [
        effect({
          kind: 'mitigation',
          target: 'enemies',
          status: 'Reprisal',
          statusId: 1193,
          percent: 10,
          durationMs: 15_000,
        }),
      ]),
      action(185, 'Adloquium', [
        effect({ kind: 'heal', target: 'target', potency: 300 }),
        effect({
          kind: 'shield',
          target: 'target',
          status: 'Galvanize',
          statusId: 297,
          percent: 180,
          of: 'healed',
          durationMs: 30_000,
        }),
      ]),
    ],
  };
}

// The Savage kill (pull 3): the boss's raidwide on both players, the tank's
// Rampart and Reprisal, the scholar's Adloquium, a tick, and a death.
export function pullTimeline(): PullTimeline {
  const hit = (at: number, target: number, extra: Partial<PullTimeline['damage'][number]> = {}) => ({
    at,
    target,
    source: 13,
    action: 45956,
    amount: 40_000,
    unmitigated: 100_000,
    mitigated: 34_000,
    absorbed: 26_000,
    overkill: 0,
    multiplier: 0.66,
    damageType: 'magic' as const,
    tick: false,
    statuses: [1191, 297, 48],
    hp: 285_090,
    ...extra,
  });
  const cast = (at: number, source: number, action: number) => ({ at, source, target: null, action, castMs: null });
  return {
    code: 'aBcD1234eFgH5678',
    pullId: 3,
    startedAt: '2026-10-20T19:03:00.000Z',
    durationMs: 303_000,
    players: [
      { id: 1, name: 'Tank Main', job: 'PLD', role: 'tank', maxHp: 325_090, stats: null },
      { id: 2, name: 'Heal Main', job: 'SCH', role: 'healer', maxHp: 200_000, stats: null },
    ],
    enemies: [
      { id: -1, name: 'Environment', boss: false },
      { id: 13, name: 'Vamp Fatale', boss: true },
    ],
    actions: [
      { id: 45956, name: 'Killer Voice' },
      { id: 500000, name: 'Combined DoTs' },
      { id: 7531, name: 'Rampart' },
    ],
    statuses: [
      { id: 48, name: 'Well Fed' },
      { id: 297, name: 'Galvanize' },
      { id: 1191, name: 'Rampart' },
      { id: 1193, name: 'Reprisal' },
    ],
    damage: [
      hit(65_000, 1),
      hit(65_000, 2, { statuses: [48], absorbed: 0, hp: 160_000 }),
      hit(70_000, 2, { source: -1, action: 500000, tick: true, unmitigated: 5_000, amount: 5_000 }),
      hit(200_000, 2, { amount: 210_000, overkill: 10_000, hp: 0, statuses: [] }),
    ],
    heals: [],
    absorbs: [],
    playerCasts: [cast(60_000, 1, 7531), cast(61_000, 1, 7535), cast(62_000, 1, 9), cast(63_000, 2, 185)],
    enemyCasts: [{ at: 60_300, source: 13, target: -1, action: 45956, castMs: 4_700 }],
    auras: [
      { status: 1193, source: 1, target: 13, from: 61_000, to: 76_000, stacks: null, shield: null },
      { status: 1191, source: 1, target: 1, from: 60_000, to: 80_000, stacks: null, shield: null },
    ],
    deaths: [{ at: 200_000, player: 2, action: 45956, source: 13 }],
  };
}
