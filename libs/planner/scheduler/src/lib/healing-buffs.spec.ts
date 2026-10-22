import { ActionEffect } from '@everise/core/api-types';
import { HealingBuffs, buffedAsPlayed, healingBuffsOf } from './healing-buffs';
import { PlannedUse } from './plan.model';
import { action, catalog, heal, pull } from './scheduler-fixtures';

const buff = (
  kind: 'healingPotency' | 'healingReceived',
  target: ActionEffect['target'],
  status: string,
  percent: number,
  statusId: number,
  condition: string | null = null,
): ActionEffect => ({
  ...heal(0),
  kind,
  target,
  status,
  statusId,
  percent,
  potency: null,
  durationMs: 20_000,
  condition,
});

// A scholar's Fey Illumination (+10% healing magic, the party), a
// paladin's Rampart (+15% healing received, self) and a Zoe-like buff only
// for the next spell.
function buffCatalog() {
  const cat = catalog();
  cat.actions.push(
    action(16538, 'Fey Illumination', ['SCH'], 120, [buff('healingPotency', 'party', 'Fey Illumination', 10, 317)]),
    action(7532, 'Rampart', ['PLD'], 90, [buff('healingReceived', 'self', 'Rampart', 15, 1191)]),
    action(24300, 'Zoe', ['SCH'], 90, [buff('healingPotency', 'self', 'Zoe', 50, 2611, 'next healing spell')]),
  );
  return cat;
}

const use = (player: number, act: number, at: number, target: number | null = null): PlannedUse => ({
  player,
  action: act,
  name: '',
  at,
  target,
  covers: [],
});

describe('healingBuffsOf', () => {
  it('reads the healing buffs, those for the next spell only when asked', () => {
    expect([...healingBuffsOf(buffCatalog()).keys()]).toEqual([16538, 7532]);
    expect(healingBuffsOf(buffCatalog(), true).get(24300)).toEqual([
      expect.objectContaining({ kind: 'potency', share: 0.5, status: 'Zoe' }),
    ]);
  });
});

describe('HealingBuffs', () => {
  const buffs = healingBuffsOf(buffCatalog());
  const event = (player: number, at: number) => ({ at, player, amount: 10_000 });

  it("multiplies a spell by its caster's potency buffs and any heal by its target's received ones", () => {
    const b = new HealingBuffs(buffs, [1, 2, 3], pull([]), new Set());
    b.add(use(2, 16538, 10_000));
    b.add(use(1, 7532, 10_000));

    const spell = b.boost([event(1, 12_000), event(3, 12_000)], use(2, 190, 11_000), true);
    const ability = b.boost([event(1, 12_000)], use(2, 189, 11_000), false);
    const later = b.boost([event(1, 40_000)], use(2, 190, 39_000), true);

    expect(spell.map((e) => Math.round(e.amount))).toEqual([12_650, 11_000]);
    expect(ability[0].amount).toBeCloseTo(11_500);
    expect(later[0].amount).toBe(10_000);
  });

  it('counts two buffs of one status once', () => {
    const b = new HealingBuffs(buffs, [1, 2, 3], pull([]), new Set());
    b.add(use(1, 7532, 10_000));
    b.add(use(1, 7532, 15_000));

    expect(b.boost([event(1, 16_000)], use(2, 189, 16_000), false)[0].amount).toBeCloseTo(11_500);
  });

  it("takes buffs the plan doesn't schedule as played, and leaves out those it does", () => {
    const timeline = pull([]);
    timeline.auras = [
      { status: 1191, source: 1, target: 1, from: 0, to: 20_000 },
      { status: 317, source: 2, target: 2, from: 0, to: 20_000 },
    ];
    const b = new HealingBuffs(buffs, [1, 2, 3], timeline, new Set(['1:7532']));

    expect(b.boost([event(1, 5_000)], use(2, 190, 5_000), true)[0].amount).toBeCloseTo(11_000);
  });
});

describe('buffedAsPlayed', () => {
  it('says a heal had a potency buff on its caster or a received one on its target', () => {
    const timeline = pull([]);
    timeline.auras = [
      { status: 2611, source: 2, target: 2, from: 0, to: 10_000 },
      { status: 1191, source: 1, target: 1, from: 20_000, to: 30_000 },
    ];
    const buffed = buffedAsPlayed(healingBuffsOf(buffCatalog(), true), timeline);

    expect([buffed(2, 3, 5_000), buffed(3, 2, 5_000), buffed(2, 1, 25_000), buffed(1, 3, 25_000)]).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });
});
