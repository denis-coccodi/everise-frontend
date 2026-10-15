import { hoursText, isOpen, openingText, repeatText } from './venue-time';

// Thursday 15 October 2026, 18:00 in the visitor's time zone.
const now = new Date(2026, 9, 15, 18, 0).getTime();
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString();
const venue = (opensAt: string, closesAt: string) => ({ opensAt, closesAt });

describe('openingText', () => {
  it('says until when a venue that is open stays open', () => {
    expect(openingText(venue(at(15, 17), at(15, 22, 30)), now, 'en-GB')).toBe('Open now, until 22:30');
  });

  it('says today, tomorrow or the weekday of the next opening', () => {
    expect(openingText(venue(at(15, 20), at(15, 23)), now, 'en-GB')).toBe('Opens today at 20:00');
    expect(openingText(venue(at(16, 19), at(16, 23)), now, 'en-GB')).toBe('Opens tomorrow at 19:00');
    expect(openingText(venue(at(18, 21), at(19, 1)), now, 'en-GB')).toBe('Opens Sunday at 21:00');
  });

  it('gives the date of an opening a week or more away', () => {
    expect(openingText(venue(at(25, 21), at(26, 1)), now, 'en-GB')).toBe('Opens Sunday 25 October at 21:00');
  });
});

describe('isOpen', () => {
  it('is open from its opening until its closing', () => {
    expect(isOpen(venue(at(15, 17), at(15, 22)), now)).toBe(true);
    expect(isOpen(venue(at(15, 19), at(15, 22)), now)).toBe(false);
    expect(isOpen(venue(at(15, 12), at(15, 18)), now)).toBe(false);
  });
});

describe('repeatText and hoursText', () => {
  const opening = (repeat: { every: 'weeks'; weeks: number } | { every: 'month'; week: number }) => ({
    opensAt: at(16, 20),
    closesAt: at(17, 1, 59),
    repeat,
  });

  it("says how an opening comes back, on its weekday in the visitor's time", () => {
    expect(repeatText(opening({ every: 'weeks', weeks: 1 }), 'en-GB')).toBe('Every Friday');
    expect(repeatText(opening({ every: 'weeks', weeks: 2 }), 'en-GB')).toBe('Every 2 weeks on Friday');
    expect(repeatText(opening({ every: 'month', week: 1 }), 'en-GB')).toBe('First Friday of the month');
    expect(repeatText(opening({ every: 'month', week: -1 }), 'en-GB')).toBe('Last Friday of the month');
  });

  it("gives an opening's hours, past midnight too", () => {
    expect(hoursText(opening({ every: 'weeks', weeks: 1 }), 'en-GB')).toBe('20:00 – 01:59');
  });
});
