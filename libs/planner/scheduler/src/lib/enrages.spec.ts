import type { FightScript } from '@everise/core/api-types';
import { mechanicsOf } from './mechanics';
import type { ReferencedTimeline } from './reference-damage.model';
import { pull } from './scheduler-fixtures';

// The party (100,000 HP each) hit by Raidwide at 10 s, then everyone killed
// by `name` at 100 s with `damage`, their deaths logged 2 s later.
function wiped(name: string, damage = 150_000): ReferencedTimeline {
  const everyone = (at: number, attack: string, amount: number) =>
    [1, 2, 3].map((p): [number, string, number, number] => [at, attack, p, amount]);
  const timeline = pull([...everyone(10, 'Raidwide', 50_000), ...everyone(100, name, damage)]);
  return { ...timeline, deaths: [1, 2, 3].map((player) => ({ at: 102_000, player, action: null, source: 13 })) };
}
const script = (enrageIds: number[]): FightScript => ({
  zone: 1327,
  title: 'AAC Heavyweight M4 (Savage)',
  mechanics: [],
  enrageIds,
  ignoredIds: [],
  source: { commit: 'abc', path: 'ui/raidboss/data/07-dt/raid/r12s.txt' },
});
const wipes = (timeline: ReferencedTimeline) => mechanicsOf(timeline).map((m) => [m.name, m.wipe ?? null]);

describe('enrages', () => {
  it("takes the fight's script's enrages, and plans for anything else", () => {
    // Arcadian Hell is the second attack: id 101.
    expect(wipes({ ...wiped('Arcadian Hell'), script: script([101]) })).toEqual([
      ['Raidwide', null],
      ['Arcadian Hell', 'enrage'],
    ]);
    // Not an enrage, though it hit everyone for many times their HP.
    expect(wipes({ ...wiped('Mana Burst', 999_999), script: script([555]) })).toEqual([
      ['Raidwide', null],
      ['Mana Burst', null],
    ]);
  });

  it("without a script, takes a raidwide that killed everyone and no other group's kill has", () => {
    const kill = pull([
      [10, 'Raidwide', 1, 50_000],
      [100, 'Mana Burst', 1, 80_000],
    ]);

    expect(wipes({ ...wiped('Arcadian Hell'), clears: [kill] })[1]).toEqual(['Arcadian Hell', 'enrage']);
    // The kills have it: a mechanic to plan for, maybe mitigated too little.
    expect(wipes({ ...wiped('Mana Burst'), clears: [kill] })[1]).toEqual(['Mana Burst', null]);
  });

  it('else, says a raidwide many times anyone HP may be an enrage', () => {
    expect(wipes(wiped('Arcadian Hell', 999_999))[1]).toEqual(['Arcadian Hell', 'maybe']);
    expect(wipes(wiped('Arcadian Hell'))[1]).toEqual(['Arcadian Hell', null]);
  });
});
