import { ago, timeLeft } from './listing-time';

const now = Date.parse('2026-10-07T18:00:00Z');

describe('listing times', () => {
  it('says how long is left, in whole minutes', () => {
    expect(timeLeft('2026-10-07T18:52:30Z', now)).toBe('52 min left');
    expect(timeLeft('2026-10-07T18:00:40Z', now)).toBe('under a minute left');
  });

  it('says how long ago, from "just now" to hours', () => {
    expect(ago('2026-10-07T17:59:50Z', now)).toBe('just now');
    expect(ago(now - 3 * 60000, now)).toBe('3 min ago');
    expect(ago('2026-10-07T16:30:00Z', now)).toBe('1 h ago');
  });
});
