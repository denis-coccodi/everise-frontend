import { playedInvulnerabilities } from './invulnerabilities';
import { mechanicsOf } from './mechanics';
import { action, catalog, heal, pull } from './scheduler-fixtures';
import { mitigationTools } from './tools';

describe('playedInvulnerabilities', () => {
  it('puts each invulnerability used on the first mechanic that hit its user while it was up', () => {
    const cat = catalog();
    cat.actions.push(
      action(30, 'Hallowed Ground', ['PLD'], 420, [
        {
          ...heal(0),
          kind: 'invulnerable',
          target: 'self',
          status: 'Hallowed Ground',
          potency: null,
          durationMs: 10_000,
        },
      ]),
    );
    const timeline = pull([
      [30, 'Raidwide', 2, 50_000],
      [32, 'Buster', 1, 150_000],
      [36, 'Buster', 1, 150_000],
      [100, 'Raidwide', 2, 50_000],
    ]);
    const cast = (at: number, actionId: number) => ({
      at: at * 1000,
      source: 1,
      target: null,
      action: actionId,
      castMs: null,
    });
    // The second covers no hit on the paladin; Rampart is no invulnerability.
    timeline.playerCasts = [cast(29, 30), cast(95, 30), cast(29, 7531)];
    const mechanics = mechanicsOf(timeline);

    expect(playedInvulnerabilities(timeline, mechanics, mitigationTools(timeline.players, cat))).toEqual([
      { player: 1, action: 30, mechanic: mechanics.find((m) => m.at === 32_000)?.id },
    ]);
  });
});
