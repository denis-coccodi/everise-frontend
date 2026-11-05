import { compareLog } from './compare-log';
import type { PlanEntry } from './plan-log.model';
import type { LogEntry } from './player-log.model';

const used = (at: number, action: string): LogEntry => ({ kind: 'use', at, action, target: null, effects: '' });
const plannedUse = (at: number, action: string): PlanEntry => ({
  kind: 'use',
  at,
  action,
  target: null,
  covers: [],
  damage: false,
  overcap: false,
});

describe('compareLog', () => {
  it('puts what happened and what the plan has at the same moment on one row', () => {
    const rows = compareLog(
      [used(60_000, 'Rampart'), used(65_400, 'Vengeance')],
      [plannedUse(65_000, 'Reprisal'), plannedUse(90_000, 'Feint')],
    );

    expect(
      rows.map((row) => [
        row.at,
        row.played.map((e) => e.action),
        row.planned.map((e) => (e.kind === 'gcd' ? 'GCD' : e.action)),
      ]),
    ).toEqual([
      [60_000, ['Rampart'], []],
      // 0.4s apart: one moment.
      [65_000, ['Vengeance'], ['Reprisal']],
      [90_000, [], ['Feint']],
    ]);
  });

  it('puts a GCD first among what the plan has at the same moment', () => {
    const rows = compareLog([], [plannedUse(8_000, 'Assize'), { ...plannedUse(8_000, 'Afflatus Misery'), gcd: true }]);

    expect(rows[0].planned.map((e) => (e.kind === 'use' ? e.action : e.kind))).toEqual(['Afflatus Misery', 'Assize']);
  });

  it('starts a new row more than a second after a row starts, and keeps an empty side empty', () => {
    const rows = compareLog([used(10_000, 'A'), used(10_900, 'B'), used(11_100, 'C')], []);

    expect(rows.map((row) => row.played.map((e) => e.action))).toEqual([['A', 'B'], ['C']]);
    expect(compareLog([], [])).toEqual([]);
  });

  it('shows a row from when its first cast began in the countdown, keeping its place', () => {
    const rows = compareLog(
      [{ ...used(500, 'Adloquium'), castAt: -1_500 }],
      [{ kind: 'gcd', at: 300, prepull: true, castAt: -2_200 }, plannedUse(20_000, 'Feint')],
    );

    expect(rows.map((row) => [row.at, row.shownAt])).toEqual([
      [300, -2_200],
      [20_000, 20_000],
    ]);
  });

  it("puts each of the plan's oGCDs in the row of its GCD before it, wherever the played side splits", () => {
    const gcd = (at: number, action: string): PlanEntry => ({ ...plannedUse(at, action), gcd: true });
    const rows = compareLog(
      // What they played at 10.6 s, past the Misery's row, opens one, which the
      // Glare at 11 s joins; the Benison at 10.8 s still goes with the Misery.
      [used(10_600, 'Sprint')],
      [
        gcd(6_000, 'Glare III'),
        plannedUse(8_000, 'Assize'),
        gcd(8_500, 'Afflatus Misery'),
        plannedUse(9_200, 'Aquaveil'),
        plannedUse(10_800, 'Divine Benison'),
        gcd(11_000, 'Glare III'),
        plannedUse(11_700, 'Temperance'),
      ],
    );

    expect(rows.map((row) => row.planned.map((e) => (e.kind === 'use' ? e.action : e.kind)))).toEqual([
      // Assize woven after the Glare before the Misery, not before the Misery.
      ['Glare III', 'Assize'],
      ['Afflatus Misery', 'Aquaveil', 'Divine Benison'],
      ['Glare III', 'Temperance'],
    ]);
    expect(rows[2].played.map((e) => e.action)).toEqual(['Sprint']);
  });
});
