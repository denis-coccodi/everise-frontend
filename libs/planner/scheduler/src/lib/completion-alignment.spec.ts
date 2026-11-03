import type { PullTimeline } from '@everise/core/api-types';
import { alignment } from './completion-alignment';
import { pull } from './scheduler-fixtures';

// A log of the boss's casts ([time in s, name]), lasting `seconds`.
function fight(casts: [number, string][], seconds: number, source = 13): PullTimeline {
  const names = [...new Set(casts.map((c) => c[1]))];
  return {
    ...pull([]),
    durationMs: seconds * 1000,
    actions: names.map((name, i) => ({ id: 500 + i, name })),
    enemyCasts: casts.map(([at, name]) => ({
      at: at * 1000,
      source,
      target: null,
      action: 500 + names.indexOf(name),
      castMs: 4000,
    })),
  };
}

const SCRIPT: [number, string][] = [
  [10, 'Killer Voice'],
  [30, 'Hardcore'],
  [55, 'Vamp Stomp'],
  [80, 'Brutal Rain'],
  [110, 'Killer Voice'],
  [140, 'Sadistic Screech'],
  [170, 'Hardcore'],
  [200, 'Finale Fatale'],
];

describe('alignment', () => {
  it('lines the wipe up with a kill on the latest cast both share, the kill shifted to continue it', () => {
    // The wipe reaches Sadistic Screech 5 s later than the kill.
    const wipe = fight(
      SCRIPT.slice(0, 6).map(([at, name]) => [at + 5, name]),
      150,
    );
    const kill = fight(SCRIPT, 220);

    expect(alignment(wipe, [kill])).toEqual({
      clear: 0,
      name: 'Sadistic Screech',
      wipeAt: 145_000,
      clearAt: 140_000,
      offset: 5000,
      endsAt: 225_000,
      matched: 6,
    });
  });

  it("takes a cast the kill repeats later for the one at the wipe's point, not the later one", () => {
    // The wipe ends on the first Killer Voice's repeat at 110 s; the kill
    // has a third Killer Voice at 230 s.
    const wipe = fight(SCRIPT.slice(0, 5), 115);
    const kill = fight([...SCRIPT, [230, 'Killer Voice']], 250);

    expect(alignment(wipe, [kill])).toMatchObject({ name: 'Killer Voice', clearAt: 110_000, offset: 0 });
  });

  it("doesn't stretch over the kill's repeats to pair more casts, minutes apart", () => {
    // The kill has the wipe's last 3 casts again 150 s later: pairing them
    // there would share 7 casts against 4, but 80 s or more apart.
    const repeat: [number, string][] = [
      [10, 'Killer Voice'],
      [30, 'Hardcore'],
      [55, 'Vamp Stomp'],
    ];
    const wipe = fight(
      [...repeat, [70, 'Brutal Rain'], [80, 'Killer Voice'], [90, 'Hardcore'], [100, 'Vamp Stomp']],
      110,
    );
    const kill = fight(
      [
        ...repeat,
        [70, 'Brutal Rain'],
        [80, 'Sadistic Screech'],
        ...repeat.map(([at, name]): [number, string] => [at + 150, name]),
      ],
      220,
    );

    expect(alignment(wipe, [kill])).toMatchObject({ name: 'Brutal Rain', offset: 0 });
  });

  it('lines up across a phase the other group pushed sooner', () => {
    // The kill skips most of Brutal Rain's phase: everything after it comes 20 s sooner.
    const wipe = fight(SCRIPT.slice(0, 7), 175);
    const kill = fight(
      SCRIPT.map(([at, name]) => [at > 80 ? at - 20 : at, name]),
      200,
    );

    expect(alignment(wipe, [kill])).toMatchObject({
      name: 'Hardcore',
      wipeAt: 170_000,
      clearAt: 150_000,
      offset: 20_000,
    });
  });

  it('counts a cast once when several copies of the boss cast it together', () => {
    const copies = fight(SCRIPT.slice(0, 4), 90);
    copies.enemyCasts.push(...copies.enemyCasts.map((c) => ({ ...c, at: c.at + 300, source: 14 })));
    copies.enemyCasts.push({ at: 81_000, source: 13, target: 1, action: 999, castMs: null });
    copies.actions.push({ id: 999, name: 'attack' });

    expect(alignment(copies, [fight(SCRIPT, 220)])).toMatchObject({ name: 'Brutal Rain', matched: 4 });
  });

  it('picks the kill whose shared casts reach furthest into the wipe', () => {
    const wipe = fight(SCRIPT.slice(0, 7), 175);
    // The first kill's log has no Sadistic Screech or Hardcore after Killer Voice.
    const partial = fight(
      SCRIPT.filter((_, i) => i < 5 || i === 7),
      220,
    );
    const whole = fight(SCRIPT, 230);

    expect(alignment(wipe, [partial, whole])).toMatchObject({ clear: 1, name: 'Hardcore' });
  });

  it("finishes the fight from the kill of a typical length, not a slow group's", () => {
    const wipe = fight(SCRIPT.slice(0, 7), 175);
    // A slow group's kill, with more of the fight's casts before it ends.
    const slow = fight([...SCRIPT, [260, 'Killer Voice'], [290, 'Brutal Rain']], 300);
    // The median of 300, 220 and 215 s.
    const typical = fight(SCRIPT, 220);

    expect(alignment(wipe, [slow, typical, fight(SCRIPT, 215)])).toMatchObject({ clear: 1, endsAt: 220_000 });
  });

  it('trusts no alignment on fewer than three shared casts', () => {
    const wipe = fight(
      [
        [10, 'Killer Voice'],
        [30, 'Hardcore'],
      ],
      40,
    );

    expect(alignment(wipe, [fight(SCRIPT, 220)])).toBeNull();
    expect(alignment(fight(SCRIPT, 220), [])).toBeNull();
  });
});
