import { MpModel, mpShortOf } from './mp';
import { catalog, pull } from './scheduler-fixtures';
import { Plan } from './plan.model';

const PHYSICK = 190;
const ADLOQUIUM = 185;

// The scholar (2) logged with this MP, as `[s, mp]` readings; Physick
// costs 400 and Adloquium 900 here.
function model(readings: [number, number][], scheduled = new Set<string>()) {
  const timeline = pull([]);
  timeline.playerCasts = [];
  timeline.players = timeline.players.map((p) =>
    p.id === 2 ? { ...p, maxMp: 10_000, mp: readings.map(([s, mp]) => ({ at: s * 1000, mp })) } : p,
  );
  const c = catalog();
  c.actions = c.actions.map((a) =>
    a.id === PHYSICK ? { ...a, mpCost: 400 } : a.id === ADLOQUIUM ? { ...a, mpCost: 900 } : a,
  );
  return { timeline, mp: MpModel.of(timeline, c, [2], scheduled) };
}

describe("a replanned healer's MP", () => {
  it('turns down a heal that would run them out, and remembers where', () => {
    // Down to 500 and back up by 200 a tick.
    const { mp } = model([
      [0, 1_000],
      [3, 500],
      [6, 700],
      [9, 900],
    ]);

    expect(mp.affordable(2, PHYSICK, 4_000, [])).toBe(true);
    expect(mp.affordable(2, ADLOQUIUM, 4_000, [])).toBe(false);
    // One Physick fits, a second doesn't.
    expect(mp.affordable(2, PHYSICK, 5_000, [{ action: PHYSICK, at: 4_000 }])).toBe(false);
    expect(mp.refused).toEqual([
      { player: 2, at: 4_000 },
      { player: 2, at: 5_000 },
    ]);
  });

  it('spends what the log let go to waste at full MP: it comes back at their own tick', () => {
    const { mp } = model([
      [0, 10_000],
      [30, 10_000],
      [33, 9_000],
    ]);

    // 900 at 0s comes back by 30s, at 200 a tick (the default: no small
    // gains in the readings to measure).
    expect(mp.curve(2, [{ action: ADLOQUIUM, at: 0 }]).at(-1)).toEqual({ at: 33_000, mp: 9_000 });
    // At 32s, only the second the log stays full gives some back.
    expect(mp.curve(2, [{ action: ADLOQUIUM, at: 32_000 }]).at(-1)?.mp).toBeCloseTo(9_000 - 900 + 200 / 3);
  });

  it('gives back what its uses as played cost, as the plan replaces them', () => {
    const { timeline } = model([]);
    timeline.playerCasts = [{ at: 2_000, source: 2, target: 1, action: ADLOQUIUM, castMs: 2_000 }];
    timeline.players = timeline.players.map((p) =>
      p.id === 2
        ? {
            ...p,
            maxMp: 10_000,
            mp: [
              { at: 0, mp: 1_000 },
              { at: 2_000, mp: 100 },
            ],
          }
        : p,
    );
    const c = catalog();
    c.actions = c.actions.map((a) => (a.id === ADLOQUIUM ? { ...a, mpCost: 900 } : a));
    const mp = MpModel.of(timeline, c, [2], new Set(['2:185']));

    // The played Adloquium's 900 is the plan's to spend.
    expect(mp.affordable(2, ADLOQUIUM, 2_000, [])).toBe(true);
  });

  it('flags a hit left short soon after a heal was turned down', () => {
    const { mp } = model([[0, 0]]);
    mp.affordable(2, PHYSICK, 10_000, []);
    const plan = {
      mechanics: [{ id: 1, at: 12_000 }],
      hits: [{ mechanic: 1, player: 1, safe: false }],
    } as unknown as Plan;

    expect(mpShortOf(mp, plan)).toEqual([{ player: 2, at: 12_000 }]);
  });
});
