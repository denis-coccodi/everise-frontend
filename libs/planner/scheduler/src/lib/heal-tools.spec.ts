import { ActionCatalog } from '@everise/core/api-types';
import { healTools } from './heal-tools';
import { action, catalog, heal, party } from './scheduler-fixtures';
import { mitigationTools } from './tools';

describe('healTools', () => {
  const power = new Map([
    [1, 50],
    [2, 100],
  ]);
  const withHeals = (): ActionCatalog => {
    const base = catalog();
    const regen = {
      ...heal(100),
      kind: 'regen' as const,
      target: 'party' as const,
      status: 'Whispering Dawn',
      statusId: 315,
      durationMs: 21_000,
    };
    return {
      ...base,
      actions: [
        ...base.actions,
        action(16537, 'Whispering Dawn', ['SCH'], 60, [regen]),
        action(140, 'Benediction', ['SCH'], 180, [{ ...heal(0), potency: null, percent: 100, of: 'maxHp' }]),
        action(3541, 'Clemency', ['PLD'], 2.5, [heal(1000)], { gcd: true }),
        action(24285, 'Kardia', ['SCH'], 5, [{ ...heal(170), condition: "each of the sage's damage spells" }]),
      ],
    };
  };
  const tools = () => {
    const c = withHeals();
    return healTools(party(), c, mitigationTools(party(), c, power), power);
  };

  it("sizes the healers' heals from their power, and healing over time a tick every 3 seconds", () => {
    const byName = new Map(tools().map((t) => [t.name, t]));

    expect(byName.get('Lustrate')?.effects).toEqual([
      { target: 'target', size: { hp: 60_000 }, ticks: 1, status: null, statusId: null },
    ]);
    expect(byName.get('Physick')).toMatchObject({ gcd: true, castMs: 1500 });
    expect(byName.get('Whispering Dawn')?.effects).toEqual([
      { target: 'party', size: { hp: 10_000 }, ticks: 7, status: 'Whispering Dawn', statusId: 315 },
    ]);
    expect(byName.get('Benediction')?.effects[0].size).toEqual({ maxHpShare: 1 });
    expect(byName.get('Lustrate')?.pool?.name).toBe('Aetherflow');
  });

  it("leaves out everyone else's heals but the mitigations', and heals that depend on what happens", () => {
    const names = tools().map((t) => t.name);

    expect(names).not.toContain('Clemency');
    expect(names).not.toContain('Kardia');
    // Adloquium is a shield the plan uses, and heals too.
    expect(names).toContain('Adloquium');
  });
});
