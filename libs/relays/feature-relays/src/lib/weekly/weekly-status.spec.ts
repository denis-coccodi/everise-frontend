import { WeeklyPost } from '@everise/core/api-types';
import { fashionReportStatus, islandSeasonStatus } from './weekly-status';

const post = (validFrom: string, validUntil: string): WeeklyPost => ({
  message: { id: '1', postedAt: validFrom, sourceName: 'x', content: '', embeds: [], attachments: [] },
  validFrom,
  validUntil,
});

describe('weekly status', () => {
  const report = post('2026-10-16T08:00:00.000Z', '2026-10-20T08:00:00.000Z');
  const next = '2026-10-23T08:00:00.000Z';

  it('says when judging opens, while it is open, and once it closed', () => {
    expect(fashionReportStatus(report, next, Date.parse('2026-10-15T08:00:00Z'))).toMatch(/^For judging from/);
    expect(fashionReportStatus(report, next, Date.parse('2026-10-17T08:00:00Z'))).toMatch(
      /^Judging is open until .* \(3 d 0 h left\)\.$/,
    );
    expect(fashionReportStatus(report, next, Date.parse('2026-10-21T08:00:00Z'))).toMatch(
      /^Judging closed .*Next judging opens .* \(in 2 d 0 h\)\.$/,
    );
    expect(fashionReportStatus(null, next, Date.parse('2026-10-21T08:00:00Z'))).toMatch(/^No Fashion Report yet\./);
  });

  it("gives an Island Sanctuary season's week, or that it is over", () => {
    const season = post('2026-10-13T08:00:00.000Z', '2026-10-20T08:00:00.000Z');
    expect(islandSeasonStatus(season, Date.parse('2026-10-14T08:00:00Z'))).toMatch(/^For the week from/);
    expect(islandSeasonStatus(season, Date.parse('2026-10-20T09:00:00Z'))).toMatch(/^This season ended/);
    expect(islandSeasonStatus(null, 0)).toMatch(/aren't posted yet/);
  });
});
