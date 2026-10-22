import { ActionEffect } from '@everise/core/api-types';
import { planHeals } from './heal-plan';
import { healPower } from './heal-power';
import { healTools } from './heal-tools';
import { mechanicsOf } from './mechanics';
import { planMitigation } from './mitigation-plan';
import { action, catalog, heal, pull } from './scheduler-fixtures';
import { mitigationTools } from './tools';

describe('planHeals', () => {
  it('counts the mitigation of the heals it plans (Kerachole, Holos)', () => {
    // A heal of the whole party that also takes 10% off for 15s.
    const field: ActionEffect = {
      ...heal(0),
      kind: 'mitigation',
      target: 'party',
      status: 'Soothing Field',
      percent: 10,
      potency: null,
      durationMs: 15_000,
    };
    const cat = catalog();
    cat.actions.push(action(99_001, 'Soothing Field', ['SCH'], 30, [field, { ...heal(500), target: 'party' }]));
    // The tank lands on 15,000 after the first buster: the field's 50,000
    // heal alone leaves them short of the second's 60,000 and the margin,
    // its 10% makes up the rest.
    const timeline = pull(
      [
        [30, 'Buster', 1, 85_000],
        [40, 'Buster', 1, 60_000],
      ],
      [[1, 2, 189, 60_000]],
    );
    const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp as number]));
    const power = healPower(timeline, cat);
    const only = <T extends { name: string }>(tools: T[]) => tools.filter((t) => t.name === 'Soothing Field');
    const mitigation = only(mitigationTools(timeline.players, cat, power));
    const heals = only(healTools(timeline.players, cat, mitigation, power));
    const options = { margin: 0.1 };

    const plan = planHeals(
      planMitigation(mechanicsOf(timeline), [], maxHp, options),
      timeline,
      mitigation,
      heals,
      maxHp,
      options,
    );

    expect(plan.uses).toEqual([expect.objectContaining({ name: 'Soothing Field', covers: [1] })]);
    expect(plan.hits[1]).toMatchObject({ planned: 54_000, safe: true, covers: ['Soothing Field'] });
    expect(plan.hits[1].hpBefore).toBe(65_000);
  });

  describe('Earthly Star', () => {
    // The scholar as an astrologian, for the star alone: 720 potency, 72,000
    // HP once grown.
    function planWithStar(hits: [number, string, number, number][]) {
      const cat = catalog();
      cat.actions.push(
        action(7439, 'Earthly Star', ['SCH'], 60, [
          { ...heal(720), target: 'party', condition: 'after 10s; 540 if detonated earlier' },
        ]),
        action(8324, 'Stellar Detonation', ['SCH'], 1, [
          { ...heal(540), target: 'party', condition: '720 once the star has grown (10s)' },
        ]),
      );
      const timeline = pull(hits, [[1, 2, 189, 60_000]]);
      const maxHp = new Map(timeline.players.map((p) => [p.id, p.maxHp as number]));
      const power = healPower(timeline, cat);
      const heals = healTools(timeline.players, cat, [], power).filter((t) => t.name === 'Earthly Star');
      const options = { margin: 0.1 };
      return planHeals(planMitigation(mechanicsOf(timeline), [], maxHp, options), timeline, [], heals, maxHp, options);
    }
    const usesOf = (plan: ReturnType<typeof planWithStar>) => plan.uses.map((u) => [u.name, u.at]);

    it('places the star 20s before it heals, where it can go off on its own', () => {
      // The tank lands on 15,000 after the first buster; the grown star
      // brings them to 87,000 for the second.
      const plan = planWithStar([
        [30, 'Buster', 1, 85_000],
        [50, 'Buster', 1, 60_000],
      ]);

      expect(usesOf(plan)).toEqual([['Earthly Star', 11_000]]);
      expect(plan.hits[1]).toMatchObject({ hpBefore: 87_000, safe: true });
    });

    it('sets it off with Stellar Detonation once grown, where there are no 20s to wait', () => {
      const plan = planWithStar([
        [15, 'Buster', 1, 85_000],
        [19, 'Buster', 1, 60_000],
      ]);

      expect(usesOf(plan)).toEqual([
        ['Earthly Star', 6000],
        ['Stellar Detonation', 16_000],
      ]);
      expect(plan.hits[1]).toMatchObject({ hpBefore: 87_000, safe: true });
    });
  });
});
