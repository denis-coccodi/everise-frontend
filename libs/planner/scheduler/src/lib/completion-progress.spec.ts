import type { Alignment } from './completion.model';
import { progress } from './completion-progress';
import { pull } from './scheduler-fixtures';

// A kill with a raidwide every 30 s from 30 s to 300 s: 10 mechanics.
const kill = pull(
  Array.from({ length: 10 }, (_, i): [number, string, number, number] => [(i + 1) * 30, `Raidwide ${i}`, 1, 50_000]),
);
const aligned = (offset: number): Alignment => ({
  clear: 0,
  name: 'Raidwide 0',
  wipeAt: 30_000 + offset,
  clearAt: 30_000,
  offset,
  endsAt: 300_000 + offset,
  matched: 3,
});

describe('progress', () => {
  it("counts the kill's mechanics before the wipe point, not the one that wiped it", () => {
    // The wipe point just before the 6th raidwide (180 s).
    expect(progress(kill, aligned(0), 179_999)).toEqual({ reached: 5, total: 10 });
  });

  it('goes by the mechanics on the wipe’s own clock: a slower group got as far later', () => {
    // Lost at 160 s: 5 in, level with the kill; 4 in, 20 s behind it (its
    // 150 s mechanic came at 170 s).
    expect(progress(kill, aligned(0), 159_999)).toEqual({ reached: 5, total: 10 });
    expect(progress(kill, aligned(20_000), 159_999)).toEqual({ reached: 4, total: 10 });
  });

  it('has every mechanic reached for a wipe past the kill’s last', () => {
    expect(progress(kill, aligned(0), 400_000)).toEqual({ reached: 10, total: 10 });
  });
});
