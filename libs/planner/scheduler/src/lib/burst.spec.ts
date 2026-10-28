import { action, catalog, pull } from './scheduler-fixtures';
import { burstUses, placeLightspeed } from './burst';
import { openingOf } from './opening';
import { Weaving } from './weaving';

// A healer (2) casting an instant GCD every 2.5s from 0.5s to the end of a
// 250s pull, but for a downtime from 115s to 135.5s.
const timeline = (job: string) => {
  const t = pull([]);
  t.durationMs = 250_000;
  t.players = [{ id: 2, name: 'Heal Main', job, role: 'healer', maxHp: 100_000, maxMp: null, mp: [], stats: null }];
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
    action(20, 'Fight or Flight', ['PLD'], 60, []),
    action(7389, 'Inner Release', ['WAR'], 60, []),
    action(52, 'Infuriate', ['WAR'], 60, [], { charges: 2 }),
    action(16138, 'No Mercy', ['GNB'], 60, []),
    action(16164, 'Bloodfest', ['GNB'], 60, []),
  );
  return c;
};
const burst = (job: string, opener: 'standard' | 'none' = 'standard') => {
  const t = timeline(job);
  const c = cat();
  const opening = openingOf(t, c, t.players, { 2: opener });
  const weaving = Weaving.of(t, c, () => true);
  // The Lightspeeds first, as the scheduler places them.
  const lightspeed = placeLightspeed(t, c, t.players, opening, weaving);
  const rest = burstUses(t, c, t.players, opening, weaving, opening.uses);
  return [...lightspeed, ...rest].map((u) => [u.name, u.at]);
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
      // Lightspeed placed first; Divination a weave after it.
      ['Lightspeed', 136_100],
      ['Divination', 136_800],
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

  it("has a warrior's Inner Release each minute and Infuriate twice, from the opener's last", () => {
    expect(burst('WAR')).toEqual([
      // After the opener's at 8.7s; one due in the downtime waits for it.
      ['Inner Release', 68_700],
      ['Inner Release', 136_100],
      ['Inner Release', 196_100],
      // Every 30s from the opener's third, at 36.2s.
      ['Infuriate', 66_200],
      ['Infuriate', 96_200],
      ['Infuriate', 136_800],
      ['Infuriate', 166_800],
      ['Infuriate', 196_800],
      ['Infuriate', 226_800],
    ]);
  });

  it("has a paladin's Fight or Flight and a gunbreaker's No Mercy and Bloodfest each minute", () => {
    expect(burst('PLD')).toEqual([
      ['Fight or Flight', 68_700],
      ['Fight or Flight', 136_100],
      ['Fight or Flight', 196_100],
    ]);
    expect(burst('GNB')).toEqual([
      ['No Mercy', 66_200],
      ['No Mercy', 136_100],
      ['No Mercy', 196_100],
      ['Bloodfest', 61_200],
      ['Bloodfest', 136_800],
      ['Bloodfest', 196_800],
    ]);
  });
});
