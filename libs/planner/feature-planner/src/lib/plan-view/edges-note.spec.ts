import { edgesNote } from './edges-note';

describe('edgesNote', () => {
  const mp = (gained: number[], dropped: number[]) => ({ player: 1, points: [], gained, dropped });

  it("says nothing when the plan's Edges are as played", () => {
    expect(edgesNote(mp([], []))).toBe('');
    expect(edgesNote(undefined)).toBe('');
  });

  it('counts those gained and lost, and the difference', () => {
    expect(edgesNote(mp([10_000, 40_000, 70_000], []))).toBe(
      "Edges of Shadow: the plan's MP pays for 3 more than played.",
    );
    expect(edgesNote(mp([], [62_000]))).toBe(
      "Edges of Shadow: the plan drops the one at 1:02 for The Blackest Night's MP.",
    );
    expect(edgesNote(mp([10_000, 40_000, 70_000], [62_000, 95_000]))).toBe(
      "Edges of Shadow: the plan's MP pays for 3 more than played, and it drops the ones at 1:02, 1:35 for The Blackest Night's MP: 1 more in all.",
    );
  });
});
