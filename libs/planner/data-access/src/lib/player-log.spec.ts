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
      icon: 800,
      description: null,
      target: null,
      effects: 'Self: −20% damage taken (20s), +15% healing received (20s)',
      castAt: null,
    });
  });

  it('gives what makes the heals possible, saying what it does, named by the log without the catalog', () => {
    const timeline = pullTimeline();
    timeline.actions.push({ id: 16542, name: 'Recitation' }, { id: 37018, name: 'Umbral Draw' });
    timeline.playerCasts.push(
      { at: 35_000, source: 2, target: null, action: 16542, castMs: null },
      { at: 36_000, source: 2, target: null, action: 37018, castMs: null },
    );

    const log = playerLog(timeline, actionCatalog(), 2).filter((e) => e.kind === 'use' && e.at < 40_000);

    expect(log).toEqual([
      expect.objectContaining({
        action: 'Recitation',
        effects: 'Makes the next Adloquium, Succor, Indomitability or Excogitation critical, with no Aetherflow',
      }),
      expect.objectContaining({
        action: 'Umbral Draw',
        effects: 'Draws the Bole, the Ewer and Lady of Crowns (with the Spear)',
      }),
    ]);
  });

  it('gives a damage spell begun in the countdown, which other casts leave out', () => {
    const timeline = pullTimeline();
    // Fast Blade (no effects) as a 1.5s cast landing at 0.3s.
    timeline.playerCasts.push({ at: 300, source: 1, target: null, action: 9, castMs: null });
    const catalog = actionCatalog();
    for (const a of catalog.actions) if (a.id === 9) a.castMs = 1_500;

    const log = playerLog(timeline, catalog, 1);

    expect(log[0]).toEqual(expect.objectContaining({ at: 300, castAt: -1_200, effects: 'Begun in the countdown' }));
    // Its cast at 62s, after the pull began, isn't listed.
    expect(log.filter((e) => e.kind === 'use' && e.at === 62_000)).toEqual([]);
  });

  it('says when a heal that landed early in the pull began, in the countdown', () => {
    const timeline = pullTimeline();
    // Adloquium (a 2s cast) landing at 0.5s, without a cast bar.
    Object.assign(timeline.playerCasts[3], { at: 500, castMs: null });
    const catalog = actionCatalog();
    for (const a of catalog.actions) if (a.name === 'Adloquium') a.castMs = 2_000;

    expect(playerLog(timeline, catalog, 2)[0]).toEqual(
      expect.objectContaining({ action: 'Adloquium', at: 500, castAt: -1_500 }),
    );
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
      // Half their max HP on each player hit, before mitigation.
      severity: { tier: 'moderate', kind: 'raidwide', share: 0.5 },
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
