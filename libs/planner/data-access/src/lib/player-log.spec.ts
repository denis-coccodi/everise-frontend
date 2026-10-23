import { actionCatalog, pullTimeline } from './planner-fixtures';
import { playerLog } from './player-log';

describe('playerLog', () => {
  it("gives a player's heals and mitigations and the hits they took, in time order", () => {
    const log = playerLog(pullTimeline(), actionCatalog(), 1);

    expect(log.map((entry) => [entry.kind, entry.at])).toEqual([
      ['use', 60_000],
      ['use', 61_000],
      ['hit', 65_000],
    ]);
    expect(log[0]).toEqual({
      kind: 'use',
      at: 60_000,
      action: 'Rampart',
      target: null,
      effects: 'Self: −20% damage taken (20s), +15% healing received (20s)',
    });
  });

  it('says who a single-target heal or shield went on', () => {
    const timeline = pullTimeline();
    timeline.playerCasts[3].target = 1;

    expect(playerLog(timeline, actionCatalog(), 2)[0]).toEqual(
      expect.objectContaining({ action: 'Adloquium', target: 'Tank Main' }),
    );
  });

  it('says what each hit did, and what covered it, the debuffs on the boss included', () => {
    const [hit] = playerLog(pullTimeline(), actionCatalog(), 1).filter((entry) => entry.kind === 'hit');

    expect(hit).toEqual({
      kind: 'hit',
      at: 65_000,
      action: 'Killer Voice',
      source: 'Vamp Fatale',
      amount: 40_000,
      unmitigated: 100_000,
      mitigated: 0.34,
      absorbed: 26_000,
      overkill: 0,
      hp: 285_090,
      hpShare: 285_090 / 325_090,
      // Well Fed is on them too, but covers nothing.
      covers: ['Rampart', 'Galvanize', 'Reprisal'],
    });
  });

  it('leaves out damage over time ticks, and gives deaths', () => {
    const log = playerLog(pullTimeline(), actionCatalog(), 2);

    expect(log.map((entry) => [entry.kind, entry.at])).toEqual([
      ['use', 63_000],
      ['hit', 65_000],
      ['hit', 200_000],
      ['death', 200_000],
    ]);
    expect(log[3]).toEqual({ kind: 'death', at: 200_000, action: 'Killer Voice' });
  });
});
