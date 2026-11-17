import type { MitigationTool, PlannedUse } from './plan.model';
import { Weaving } from './weaving';
import { ZOE, zoeOptions } from './zoe-shields';

describe('zoeOptions', () => {
  const tool = (action: number, name: string, extra: Partial<MitigationTool> = {}) =>
    ({
      player: 5,
      action,
      name,
      recastMs: 2_500,
      charges: 1,
      gcd: true,
      castMs: 1_500,
      group: `5:${name}`,
      effects: [],
      ...extra,
    }) as unknown as MitigationTool;
  const prognosis = tool(37034, 'Eukrasian Prognosis II');
  const zoe = tool(ZOE, 'Zoe', { recastMs: 90_000, gcd: false, castMs: 0, group: '5:zoe' });
  const options = (uses: PlannedUse[] = [], light = false) =>
    zoeOptions(
      [prognosis, zoe],
      uses,
      (u) => (u.action === ZOE ? zoe : prognosis),
      () => [],
      new Weaving(),
      {
        margin: 0.1,
        ...(light ? { noRaidwideShields: 'light' as const } : {}),
      },
    );

  it("offers a sage's Eukrasian Prognosis with Zoe in the weave slot before it, its barrier 50% bigger", () => {
    const [option] = options()(prognosis, 60_000);

    expect(option.boost).toBe(1.5);
    expect(option.granted.map((g) => [g.use.name, g.use.at < 60_000])).toEqual([['Zoe', true]]);
  });

  it("offers none while Zoe is recasting, for a heal it doesn't boost, or on the plan made the old way", () => {
    const used = [{ player: 5, action: ZOE, name: 'Zoe', at: 40_000, target: null, covers: [] }];

    expect(options(used)(prognosis, 60_000)).toEqual([]);
    expect(options()(tool(24296, 'Druochole'), 60_000)).toEqual([]);
    expect(options([], true)(prognosis, 60_000)).toEqual([]);
  });
});
