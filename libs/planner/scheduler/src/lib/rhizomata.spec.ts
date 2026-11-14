import { fitsPool } from './coverage';
import { beforeHeavy, rhizomataTimes } from './rhizomata';
import type { Mechanic } from './plan.model';
import { Weaving } from './weaving';

describe('rhizomataTimes', () => {
  // Addersgall: one every 20s, up to 3, full at the pull.
  const pool = { name: 'Addersgall', gainMs: 20_000, max: 3 };

  it('uses Rhizomata once the heals leave fewer than two stacks, then as its recast allows', () => {
    // Two at 10s leave one: Rhizomata then. The next two (40s) leave 1.5
    // with its stack, but it's back only at 100s; at 120s two more leave
    // less than two again.
    const times = rhizomataTimes(
      2,
      pool,
      [10_000, 10_500, 40_000, 40_500, 120_000, 120_500],
      new Weaving(),
      [],
      300_000,
    );

    expect(times).toEqual([10_500, 120_500]);
  });

  it('holds it while there are two stacks or more', () => {
    expect(rhizomataTimes(2, pool, [10_000, 60_000, 110_000], new Weaving(), [], 300_000)).toEqual([]);
  });

  it('counts its stack for the uses after', () => {
    // Without it, a fourth use 1s after three is one too many.
    const uses = [10_000, 10_500, 11_000];
    expect(fitsPool(uses, 12_000, pool)).toBe(false);
    expect(fitsPool(uses, 12_000, { ...pool, bonus: [11_500] })).toBe(true);
  });
});

describe('beforeHeavy', () => {
  const mechanic = (id: number, at: number): Mechanic => ({
    id,
    at,
    action: id,
    name: `M${id}`,
    kind: 'raidwide',
    damageType: 'magic',
    hits: [],
  });

  it('keeps the Rhizomata a heavy mechanic follows within 15s, as the logs have it', () => {
    const mechanics = [mechanic(1, 20_000), mechanic(2, 120_000), mechanic(3, 230_000)];
    const times = new Map([[5, [10_000, 100_000, 200_000]]]);

    // A heavy one 10s after the first, 20s after the second (too late); the third's is light.
    expect(beforeHeavy(times, mechanics, new Set([1, 2]))).toEqual(new Map([[5, [10_000]]]));
  });
});
