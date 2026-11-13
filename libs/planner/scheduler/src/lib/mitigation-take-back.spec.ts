import { takeBackGcds } from './mitigation-take-back';
import type { Mechanic, MitigationTool, PlannedUse } from './plan.model';
import type { MpModel } from './mp';

describe('takeBackGcds', () => {
  // A raidwide at 30 s on players 1 to 3; players 1 and 2 are healers.
  const raidwide = {
    id: 0,
    at: 30_000,
    hits: [1, 2, 3].map((player) => ({ player })),
  } as unknown as Mechanic;
  const shield = (player: number, action: number, extra: Partial<MitigationTool> = {}) =>
    ({
      player,
      action,
      name: `Shield ${action}`,
      gcd: true,
      castMs: 0,
      grantedBy: null,
      effects: [{ target: 'party', durationMs: 30_000 }],
      ...extra,
    }) as unknown as MitigationTool;
  const succor = shield(1, 186);
  const helios = shield(2, 3601);
  const soil = { ...shield(1, 188), gcd: false };
  const deployment = { ...shield(1, 3585), gcd: false, grantedBy: { action: 186, uses: 1, withinMs: 30_000 } };
  const use = (t: MitigationTool, at: number, extra: Partial<PlannedUse> = {}): PlannedUse => ({
    player: t.player,
    action: t.action,
    name: t.name,
    at,
    target: null,
    covers: [],
    ...extra,
  });
  // Player 1 is low on MP, player 2 has plenty.
  const mp = {
    shares: (player: number) => () => (player === 1 ? 0.2 : 0.9),
    curve: () => [],
  } as unknown as MpModel;
  const toolOf = (uses: [PlannedUse, MitigationTool][]) => {
    const map = new Map(uses);
    return (u: PlannedUse) => map.get(u) as MitigationTool;
  };
  // Each use up before 30 s takes 40 off a 100 hit; it may do `limit`.
  const checksWith = (uses: PlannedUse[], limit: number) => ({
    hit: (m: Mechanic) => ({
      damage: m.at === 30_000 ? 100 - 40 * uses.filter((u) => u.at <= 30_000).length : 50,
      invulnerable: false,
    }),
    limit: () => limit,
  });

  it('takes back a GCD the uses after it made unneeded, from the healer lowest on MP first', () => {
    const pairs: [PlannedUse, MitigationTool][] = [
      [use(succor, 25_000), succor],
      [use(helios, 26_000), helios],
      [use(soil, 28_000), soil],
    ];
    const uses = pairs.map(([u]) => u);

    takeBackGcds(uses, 0, toolOf(pairs), [raidwide], checksWith(uses, 30), mp);

    expect(uses.map((u) => u.name)).toEqual(['Shield 3601', 'Shield 188']);
  });

  it('keeps one the next hit needs, landing on what this one left', () => {
    const pairs: [PlannedUse, MitigationTool][] = [[use(succor, 25_000), succor]];
    const uses = pairs.map(([u]) => u);
    // 2 s later another hit of 50 that may do 60: with the 40 more taken
    // before it, it would do too much.
    const next = { ...raidwide, id: 1, at: 32_000 } as Mechanic;
    const checks = checksWith(uses, 60);
    const limit = (m: Mechanic) => (m.at === 30_000 ? 100 : 60);

    takeBackGcds(uses, 0, toolOf(pairs), [raidwide, next], { ...checks, limit }, mp);

    expect(uses).toHaveLength(1);
  });

  it('keeps one every hit still needs', () => {
    const pairs: [PlannedUse, MitigationTool][] = [
      [use(succor, 25_000), succor],
      [use(helios, 26_000), helios],
    ];
    const uses = pairs.map(([u]) => u);

    takeBackGcds(uses, 0, toolOf(pairs), [raidwide], checksWith(uses, 30), mp);

    expect(uses).toHaveLength(2);
  });

  it("keeps an earlier round's, a critical one and one Deployment Tactics needs", () => {
    const pairs: [PlannedUse, MitigationTool][] = [
      [use(succor, 20_000), succor],
      [use(succor, 22_000, { critical: true }), succor],
      [use(succor, 24_000), succor],
      [use(deployment, 26_000), deployment],
    ];
    const uses = pairs.map(([u]) => u);

    takeBackGcds(uses, 1, toolOf(pairs), [raidwide], checksWith(uses, Infinity), mp);

    expect(uses).toHaveLength(4);
  });
});
