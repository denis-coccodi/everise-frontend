import { dayHeading, dayKey, hoursText, isLive, whenText } from './event-time';

// Friday 16 October 2026, 18:00 in the visitor's time zone.
const now = new Date(2026, 9, 16, 18, 0).getTime();
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString();
const event = (startsAt: string, endsAt: string) => ({ startsAt, endsAt });

describe('whenText', () => {
  it('says until when an event that is on goes', () => {
    expect(whenText(event(at(16, 17), at(16, 22, 30)), now, 'en-GB')).toBe('On now, until 22:30');
  });

  it('says today, tomorrow or the weekday it starts', () => {
    expect(whenText(event(at(16, 20), at(16, 23)), now, 'en-GB')).toBe('Starts today at 20:00');
    expect(whenText(event(at(17, 19), at(17, 23)), now, 'en-GB')).toBe('Starts tomorrow at 19:00');
    expect(whenText(event(at(19, 21), at(20, 1)), now, 'en-GB')).toBe('Starts Monday at 21:00');
  });

  it('gives the date of an event a week or more away', () => {
    expect(whenText(event(at(25, 21), at(26, 1)), now, 'en-GB')).toBe('Starts Sunday 25 October at 21:00');
  });
});

describe('isLive', () => {
  it('is on from its start until its end', () => {
    expect(isLive(event(at(16, 17), at(16, 22)), now)).toBe(true);
    expect(isLive(event(at(16, 19), at(16, 22)), now)).toBe(false);
    expect(isLive(event(at(16, 12), at(16, 18)), now)).toBe(false);
  });
});

describe('hoursText, dayHeading and dayKey', () => {
  it("gives an event's hours, past midnight too", () => {
    expect(hoursText(event(at(16, 20), at(17, 1)), 'en-GB')).toBe('20:00 – 01:00');
  });

  it('names the day a long event ends', () => {
    expect(hoursText(event(at(15, 23), at(16, 19, 30)), 'en-GB')).toBe('23:00 – Friday 19:30');
  });

  it('names the day an event starts on', () => {
    expect(dayHeading(at(16, 23), now, 'en-GB')).toBe('Today');
    expect(dayHeading(at(17, 1), now, 'en-GB')).toBe('Tomorrow');
    expect(dayHeading(at(18, 20), now, 'en-GB')).toBe('Sunday 18 October');
  });

  it('puts the events of one calendar day together', () => {
    expect(dayKey(at(17, 0, 30))).toBe(dayKey(at(17, 23, 59)));
    expect(dayKey(at(16, 23, 59))).not.toBe(dayKey(at(17, 0, 0)));
  });
});
