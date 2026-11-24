import { weavesFull } from './weaving-slots';

describe('weavesFull', () => {
  const gcds = (...at: number[]) => at.map((from) => ({ from }));
  const ogcds = (...at: number[]) => at.map((from) => ({ from }));

  it('fills a 2.5s gap with two oGCDs, however close they were pressed', () => {
    // GCDs at 0 and 2.5s; theirs at 0.55s and 1.09s leave 0.7s of time free before the GCD, but no slot.
    const full = weavesFull(gcds(0, 2500, 5000), ogcds(550, 1090));
    expect(full(1800)).toBe(true);
    expect(full(3100)).toBe(false);
  });

  it('fits a third in a gap of 2.7s or more, and anything past the last GCD', () => {
    expect(weavesFull(gcds(0, 2800), ogcds(600, 1300))(2000)).toBe(false);
    expect(weavesFull(gcds(0), ogcds(600, 1300))(2000)).toBe(false);
  });
});
