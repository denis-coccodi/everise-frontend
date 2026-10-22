import { readReportLink } from './report-link';

describe('readReportLink', () => {
  it.each([
    ['a code', 'aBcD1234eFgH5678', { code: 'aBcD1234eFgH5678', pull: null }],
    ['an anonymous code', 'a:aBcD1234eFgH5678', { code: 'a:aBcD1234eFgH5678', pull: null }],
    ['a report page', 'https://www.fflogs.com/reports/aBcD1234eFgH5678', { code: 'aBcD1234eFgH5678', pull: null }],
    [
      'a pull in the query',
      'https://www.fflogs.com/reports/aBcD1234eFgH5678?fight=12&type=damage-done',
      { code: 'aBcD1234eFgH5678', pull: 12 },
    ],
    [
      'a pull in the hash',
      'https://www.fflogs.com/reports/aBcD1234eFgH5678#fight=7&type=healing',
      { code: 'aBcD1234eFgH5678', pull: 7 },
    ],
    ['a link without https', 'fflogs.com/reports/aBcD1234eFgH5678', { code: 'aBcD1234eFgH5678', pull: null }],
    ['spaces around it', '  aBcD1234eFgH5678 ', { code: 'aBcD1234eFgH5678', pull: null }],
    [
      '"last" as the pull',
      'https://www.fflogs.com/reports/aBcD1234eFgH5678#fight=last',
      { code: 'aBcD1234eFgH5678', pull: null },
    ],
  ])('reads %s', (_case, text, expected) => {
    expect(readReportLink(text)).toEqual(expected);
  });

  it.each([
    ['a short code', 'aBcD1234'],
    ['another site', 'https://example.com/reports/aBcD1234eFgH5678'],
    ['a character page', 'https://www.fflogs.com/character/eu/odin/someone'],
    ['nothing', ''],
  ])('refuses %s', (_case, text) => {
    expect(readReportLink(text)).toBeNull();
  });
});
