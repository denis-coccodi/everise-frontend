import { refillWorth } from './heal-refill';

describe('refillWorth', () => {
  it('lets the healer with MP to spare refill with a GCD heal, none below the reserve', () => {
    expect(refillWorth(1)).toBe(1);
    expect(refillWorth(0.5)).toBe(0.5);
    expect(refillWorth(0.2)).toBe(0);
  });
});
