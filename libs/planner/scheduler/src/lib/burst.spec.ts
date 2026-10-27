import { action, catalog, pull } from './scheduler-fixtures';
import { burstUses } from './burst';
import { openingOf } from './opening';
import { Weaving } from './weaving';

// A healer (2) casting an instant GCD every 2.5s from 0.5s to the end of a
// 250s pull, but for a downtime from 115s to 135.5s.
const timeline = (job: string) => {
  const t = pull([]);
  t.durationMs = 250_000;
  t.players = [{ id: 2, name: 'Heal Main', job, role: 'healer', maxHp: 100_000, stats: null }];
  t.playerCasts = Array.from({ length: 100 }, (_, i) => 500 + i * 2500)
    .filter((at) => at < 115_000 || at >= 135_000)
    .map((at) => ({ at, source: 2, target: null, action: 9, castMs: null }));
  return t;
};
const cat = () => {
  const c = catalog();
  c.actions.push(
    action(9, 'Broil IV', ['SCH', 'AST', 'WHM', 'SGE'], 2.5, [], { gcd: true }),
    action(7436, 'Chain Stratagem', ['SCH'], 120, []),
    action(16552, 'Divination', ['AST'], 120, []),
    action(3606, 'Lightspeed', ['AST'], 60, [], { charges: 2 }),
    action(136, 'Presence of Mind', ['WHM'], 120, []),
  );
  return c;
};
const burst = (job: string, opener: 'standard' | 'none' = 'standard') => {
  const t = timeline(job);
  const c = cat();
  const opening = openingOf(t, c, t.players, { 2: opener });
  return burstUses(
    t,
    c,
    t.players,
    opening,
    Weaving.of(t, c, () => true),
  ).map((u) => [u.name, u.at]);
};

describe('burstUses', () => {
  it("has a scholar's Chain Stratagem on cooldown after the opener's, waiting out the downtime", () => {
    // The opener's at 6.2s; the next due at 126.2s, in the downtime: after
    // their first GCD back (135.5s).
    expect(burst('SCH')).toEqual([['Chain Stratagem', 136_100]]);
  });

  it('starts it at the first GCD without an opener', () => {
    expect(burst('SCH', 'none')).toEqual([
      ['Chain Stratagem', 1_100],
      ['Chain Stratagem', 136_100],
    ]);
  });

  it("has a white mage's Presence of Mind on cooldown", () => {
    expect(burst('WHM')).toEqual([['Presence of Mind', 136_100]]);
  });

  it("has an astrologian's Divination and a Lightspeed each two minutes, and their draws each with its card", () => {
    expect(burst('AST')).toEqual([
      // A weave after each other where they meet.
      ['Divination', 136_100],
      ['Lightspeed', 136_800],
      // Astral Draw (the countdown's, then 110s on) with the Balance, Umbral
      // Draw (the opener's at 11.9s, then 110s on) with the Spear: each card
      // a weave after its draw, or after the next GCD when there's no room.
      ['Astral Draw', 66_900],
      ['the Balance', 68_600],
      ['Umbral Draw', 138_600],
      ['the Spear', 139_300],
      ['Astral Draw', 176_900],
      ['the Balance', 178_600],
      ['Umbral Draw', 231_900],
      ['the Spear', 233_600],
    ]);
  });
});
