import type { PullTimeline } from '@everise/core/api-types';
import { completedTimeline } from './completion-timeline';
import type { Alignment } from './completion.model';
import { catalog, pull } from './scheduler-fixtures';

const RAMPART = 7531;
const RAMPART_STATUS = 1191;

// The wipe: a paladin (1), a scholar (2) and a bard (3), all killed by
// Finale Fatale at 100 s.
function wipe(): PullTimeline {
  return {
    ...pull([
      [10, 'Killer Voice', 1, 50_000],
      [10, 'Killer Voice', 2, 50_000],
      [10, 'Killer Voice', 3, 50_000],
      [100, 'Finale Fatale', 1, 999_999],
      [100, 'Finale Fatale', 2, 999_999],
      [100, 'Finale Fatale', 3, 999_999],
    ]),
    durationMs: 104_000,
    playerCasts: [{ at: 60_000, source: 1, target: 1, action: RAMPART, castMs: null }],
    deaths: [1, 2, 3].map((player) => ({ at: 101_000, player, action: null, source: 13 })),
  };
}

// Another group's kill: a paladin (11), a white mage (12) and a bard (13),
// its boss (40) the wipe's by name, with an add (41) the wipe never saw.
function kill(): PullTimeline {
  const base = pull([
    [90, 'Hardcore', 11, 200_000],
    [96, 'Hardcore', 11, 210_000],
    [120, 'Brutal Rain', 12, 80_000],
    [120, 'Brutal Rain', 13, 80_000],
  ]);
  const players = [
    { ...base.players[0], id: 11 },
    { ...base.players[1], id: 12, job: 'WHM' },
    { ...base.players[2], id: 13, mp: [{ at: 150_000, mp: 9000 }] },
  ];
  const aura = (from: number, source: number, status: number) => ({
    status,
    source,
    target: source,
    from,
    to: from + 20_000,
    stacks: null,
    shield: null,
  });
  return {
    ...base,
    code: 'Other0000000000a',
    pullId: 7,
    durationMs: 195_000,
    players,
    enemies: [
      { id: 40, name: 'Boss', boss: true },
      { id: 41, name: 'Bat', boss: false },
    ],
    damage: [
      ...base.damage.map((h) => ({ ...h, source: 40 })),
      { ...base.damage[0], at: 130_000, source: 41, target: 13 },
    ],
    playerCasts: [
      { at: 100_000, source: 11, target: 11, action: RAMPART, castMs: null },
      { at: 160_000, source: 11, target: 11, action: RAMPART, castMs: null },
      { at: 110_000, source: 12, target: null, action: 16534, castMs: null },
    ],
    heals: [
      {
        at: 110_000,
        source: 12,
        pet: null,
        target: 11,
        action: 16534,
        status: null,
        amount: 30_000,
        overheal: 0,
        tick: false,
        estimated: false,
        hp: null,
      },
    ],
    auras: [aura(100_000, 11, RAMPART_STATUS), aura(160_000, 11, RAMPART_STATUS)],
    enemyCasts: [{ at: 115_000, source: 41, target: 12, action: 777, castMs: 3000 }],
  };
}

// The kill 5 s behind the wipe: its 95 s is the wipe's 100 s.
const aligned: Alignment = {
  clear: 0,
  name: 'Killer Voice',
  wipeAt: 15_000,
  clearAt: 10_000,
  offset: 5000,
  endsAt: 200_000,
  matched: 12,
};

function withRampartStatus() {
  const c = catalog();
  const rampart = c.actions.find((a) => a.id === RAMPART);
  if (rampart) rampart.effects = [{ ...rampart.effects[0], statusId: RAMPART_STATUS }];
  return c;
}

describe('completedTimeline', () => {
  it("continues the wipe at its wipe point with the kill's hits, shifted and retargeted", () => {
    const done = completedTimeline(wipe(), kill(), aligned, catalog());

    // The wipe's own hits up to Finale Fatale; then the kill's from its 95 s.
    expect(done?.damage.map((h) => [h.at, h.target, h.source, h.unmitigated])).toEqual([
      [10_000, 1, 13, 50_000],
      [10_000, 2, 13, 50_000],
      [10_000, 3, 13, 50_000],
      [101_000, 1, 13, 210_000],
      [125_000, 2, 13, 80_000],
      [125_000, 3, 13, 80_000],
      [135_000, 3, 1_000_041, 200_000],
    ]);
    expect(done?.enemies.map((e) => e.name)).toEqual(['Boss', 'Bat']);
    expect(done?.enemyCasts).toEqual([{ at: 120_000, source: 1_000_041, target: 2, action: 777, castMs: 3000 }]);
    expect(done?.durationMs).toBe(200_000);
    // The deaths to the wipe are gone.
    expect(done?.deaths).toEqual([]);
    expect(done?.completion).toEqual({
      from: 99_999,
      clear: { code: 'Other0000000000a', pullId: 7 },
      plannedFrom: [2],
    });
  });

  it("brings what the players of their stand-in's job did, not the others'", () => {
    const done = completedTimeline(wipe(), kill(), aligned, catalog());

    // The paladin's second Rampart (the first is still on cooldown); the
    // white mage's heal isn't the scholar's to copy.
    expect(done?.playerCasts.map((c) => [c.at, c.source, c.action])).toEqual([
      [60_000, 1, RAMPART],
      [165_000, 1, RAMPART],
    ]);
    expect(done?.heals).toEqual([]);
    // The bard's MP after the wipe point is their stand-in's.
    expect(done?.players.find((p) => p.id === 3)?.mp).toEqual([{ at: 155_000, mp: 9000 }]);
  });

  it('leaves out a copied skill the player still has on cooldown, with the status it put up', () => {
    const done = completedTimeline(wipe(), kill(), aligned, withRampartStatus());

    // Rampart at 60 s is back at 150 s: the copy at 105 s goes, the one at 165 s stays.
    expect(done?.playerCasts.map((c) => c.at)).toEqual([60_000, 165_000]);
    expect(done?.auras.map((a) => [a.from, a.target])).toEqual([[165_000, 1]]);
  });

  it('adds nothing when the kill ends before the wipe point', () => {
    expect(completedTimeline(wipe(), kill(), { ...aligned, endsAt: 99_000 }, catalog())).toBeNull();
  });
});
