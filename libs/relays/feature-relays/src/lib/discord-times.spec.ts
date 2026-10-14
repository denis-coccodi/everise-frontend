import { countdown, discordTime, relativeTime } from './discord-times';

describe('discord times', () => {
  const now = Date.UTC(2026, 9, 14, 12, 0);

  it('says how far a time is, either way', () => {
    expect(relativeTime(now + 6 * 60 * 1000, now)).toMatch(/6 minutes/);
    expect(relativeTime(now - 2 * 60 * 60 * 1000, now)).toMatch(/2 hours ago/);
  });

  it('shows the relative style as words, the others as a date', () => {
    expect(discordTime(now + 60 * 1000, 'R', now)).toMatch(/minute/);
    expect(discordTime(now, 'D', now)).toMatch(/2026/);
  });

  it('counts down in days, hours or minutes', () => {
    expect(countdown(now + (2 * 24 + 5) * 60 * 60 * 1000, now)).toBe('2 d 5 h');
    expect(countdown(now + (3 * 60 + 12) * 60 * 1000, now)).toBe('3 h 12 min');
    expect(countdown(now + 8 * 60 * 1000, now)).toBe('8 min');
    expect(countdown(now - 1000, now)).toBe('0 min');
  });
});
