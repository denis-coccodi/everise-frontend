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

  it('counts the grown Earthly Star as a delayed heal, set off by Stellar Detonation', () => {
    const c = withHeals();
    c.actions.push(
      action(7439, 'Earthly Star', ['SCH'], 60, [
        { ...heal(720), target: 'party', condition: 'after 10s; 540 if detonated earlier' },
      ]),
      action(8324, 'Stellar Detonation', ['SCH'], 1, [
        { ...heal(540), target: 'party', condition: '720 once the star has grown (10s)' },
      ]),
    );
    const byName = new Map(healTools(party(), c, [], power).map((t) => [t.name, t]));

    expect(byName.get('Earthly Star')).toMatchObject({
      effects: [{ target: 'party', size: { hp: 72_000 } }],
      delayed: {
        delaysMs: [20_000, 10_000],
        release: { action: 8324, name: 'Stellar Detonation' },
        loggedAs: 'Stellar Explosion',
      },
    });
    expect(byName.get('Lustrate')?.delayed).toBeNull();
    // Only with a star out: never a heal of its own.
    expect(byName.has('Stellar Detonation')).toBe(false);
  });

  it('reads the heals that wait for half HP or their end from their condition', () => {
    const waiting = (status: string, potency: number, seconds: number, condition: string) => ({
      ...heal(potency),
      kind: 'delayedHeal' as const,
      status,
      durationMs: seconds * 1000,
      condition,
    });
    const c = withHeals();
    c.actions.push(
      action(7434, 'Excogitation', ['SCH'], 45, [
        waiting('Excogitation', 800, 45, 'at 50% HP or below, or when it ends'),
      ]),
      action(25873, 'Exaltation', ['SCH'], 60, [waiting('Exaltation', 500, 8, 'when it ends')]),
      action(24305, 'Haima', ['SCH'], 120, [waiting('Haima', 150, 15, 'each stack left when it ends')]),
    );
    const byName = new Map(healTools(party(), c, [], power).map((t) => [t.name, t]));

    expect(byName.get('Excogitation')).toMatchObject({
      effects: [{ target: 'target', size: { hp: 80_000 } }],
      pool: { name: 'Aetherflow' },
      delayed: { delaysMs: [45_000], release: null, belowShare: 0.5, loggedAs: 'Excogitation' },
    });
    expect(byName.get('Exaltation')?.delayed).toMatchObject({ delaysMs: [8000], belowShare: null });
    // Its stacks aren't counted yet.
    expect(byName.has('Haima')).toBe(false);
  });
});
