import type { ReportPull } from '@everise/core/api-types';
import { furtherPulls } from './further-pulls';
import { fightReport } from './planner-fixtures';

// Pulls of one fight (101) unless said: [id, kill, share of the fight left].
function pulls(...list: [number, boolean, number | null, number?][]): ReportPull[] {
  const [base] = fightReport().pulls;
  return list.map(([id, kill, fightLeft, encounterId = 101]) => ({ ...base, id, kill, fightLeft, encounterId }));
}

describe('furtherPulls', () => {
  it("takes the fight's kills, then the wipes with less of it left, at most 3", () => {
    const report = pulls([1, false, 80], [2, false, 40], [3, false, 60], [4, true, 0], [5, false, 30], [6, false, 20]);

    expect(furtherPulls(report, 3).map((p) => p.id)).toEqual([4, 6, 5]);
  });

  it("leaves out the pull itself, the ones that didn't get as far, and other fights", () => {
    const report = pulls([1, false, 80], [2, false, 40], [3, false, 10, 102], [4, false, null]);

    expect(furtherPulls(report, 2).map((p) => p.id)).toEqual([]);
    expect(furtherPulls(report, 1).map((p) => p.id)).toEqual([2]);
  });
});
