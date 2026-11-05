import type { GcdCast } from './weaving.model';
import { withRhythm } from './weaving-rhythm';

// GCDs every 2.4 s, instant (castMs 0), at these seconds.
const played = (...seconds: number[]): GcdCast[] => seconds.map((s) => ({ at: s * 1000, castMs: 0 }));
const filledAt = (gcds: GcdCast[]) => gcds.filter((g) => g.filled).map((g) => g.at / 1000);

describe('withRhythm', () => {
  it('carries on at their own rhythm through a gap in their GCDs', () => {
    // 2.4 s apart, then nothing from 7.2 s to 16.8 s: three missed.
    const gcds = withRhythm(played(0, 2.4, 4.8, 7.2, 16.8, 19.2), [], []);

    expect(filledAt(gcds).map((s) => +s.toFixed(1))).toEqual([9.6, 12, 14.4]);
    expect(gcds.find((g) => g.filled)).toMatchObject({ castMs: 0, filled: true });
  });

  it('leaves a gap where nothing could be targeted, or across a death of theirs', () => {
    const gaps = played(0, 2.4, 4.8, 7.2, 16.8, 19.2, 21.6, 31.2);

    // Downtime over the first gap; a death in the second.
    const gcds = withRhythm(gaps, [{ from: 8_000, to: 16_000 }], [25_000]);

    expect(filledAt(gcds)).toEqual([]);
  });

  it('fills nothing for a GCD and a half or less', () => {
    expect(filledAt(withRhythm(played(0, 2.4, 4.8, 8.4), [], []))).toEqual([]);
  });
});
