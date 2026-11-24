import { firstPressAt, ogcdWithFirstBefore, withFirst } from './first-press';
import { Weaving } from './weaving';

describe('first presses', () => {
  // Player 1's instant GCDs every 2.5s from 10s: two weave slots in each gap.
  const weaving = new Weaving(
    [10_000, 12_500, 15_000, 17_500, 20_000].map((at) => ({ at, source: 1, target: null, action: 9, castMs: null })),
    new Map([[9, true]]),
  );
  const ogcd = (at: number) => ({ at, gcd: false, castMs: 0 });
  const GRASSA = 34686;
  const FINISH = 25789;

  it("puts Tempera Coat in Grassa's gap, else in the one before", () => {
    expect(firstPressAt(weaving, 1, GRASSA, 14_300, [])).toBe(13_600);
    expect(firstPressAt(weaving, 1, GRASSA, 14_300, [ogcd(13_600)])).toBe(11_800);
    expect(withFirst(weaving, 1, GRASSA, 14_300, [])).toEqual({ firstAt: 13_600 });
  });

  it("puts Improvisation only in its finish's gap", () => {
    expect(firstPressAt(weaving, 1, FINISH, 14_300, [])).toBe(13_600);
    expect(firstPressAt(weaving, 1, FINISH, 14_300, [ogcd(13_600)])).toBeNull();
    expect(ogcdWithFirstBefore(weaving, 1, FINISH, 15_000, 12_500, [ogcd(13_600)])).toBeNull();
    expect(ogcdWithFirstBefore(weaving, 1, FINISH, 17_500, 12_500, [ogcd(13_600)])).toBe(16_800);
  });

  it('needs none for other actions', () => {
    expect(firstPressAt(weaving, 1, 7531, 14_300, [])).toBeUndefined();
    expect(withFirst(weaving, 1, 7531, 14_300, [])).toEqual({});
  });

  it('takes its slot from the others once planned', () => {
    expect(weaving.ogcdBefore(1, 15_000, 12_500, [{ ...ogcd(14_300), firstAt: 13_600 }])).toBeNull();
  });
});
