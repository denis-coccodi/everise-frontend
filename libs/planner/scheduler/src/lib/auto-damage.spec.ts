import { AutoDamage } from './auto-damage';
import { pullFacts } from './coverage';
import type { Mechanic, MitigationEffect, MitigationTool, PlannedUse } from './plan.model';
import { pull } from './scheduler-fixtures';

const effect = (status: string, physical: number, durationMs: number, shield?: number): MitigationEffect => ({
  target: 'self',
  physical,
  magic: physical,
  shield: shield ? { hp: shield } : null,
  hits: 1,
  durationMs,
  status,
  stack: status,
  invulnerable: null,
});
const tool = (action: number, effects: MitigationEffect[]) =>
  ({ action, effects, castMs: 0, gcd: false }) as MitigationTool;
const RAMPART = tool(1, [effect('Rampart', 0.2, 20_000)]);
const TBN = tool(2, [effect('Blackest Night', 0, 7_000, 25_000)]);
// A tank buster at 22s.
const BUSTER: Mechanic = {
  id: 1,
  at: 22_000,
  action: 9,
  name: 'Buster',
  kind: 'tankbuster',
  damageType: 'physical',
  hits: [{ player: 1, unmitigated: 50_000, asPlayed: 0, avoidable: false }],
};
const use = (action: number, at: number): PlannedUse => ({ player: 1, action, name: '', at, target: null, covers: [] });

// The tank (1) takes the boss's autos: [s, damage before mitigation,
// damage as dealt]; the plan's uses, and its mechanics (none by default).
function autos(hits: [number, number | null, number][], uses: PlannedUse[], mechanics: Mechanic[] = []) {
  const timeline = pull(hits.map(([s, , dealt]) => [s, 'Attack', 1, dealt]));
  timeline.damage.forEach((d, i) => (d.unmitigated = hits[i][1]));
  const tools = new Map([RAMPART, TBN].map((t) => [t.action, t]));
  const damage = new AutoDamage(
    timeline,
    uses,
    (u) => tools.get(u.action),
    pullFacts(mechanics, new Map([[1, 100_000]])),
  );
  return { damage, hits: timeline.damage };
}

describe("the autos with the plan's mitigations", () => {
  it('counts what the plan takes off, not what was up as played', () => {
    // As played, the tank had 50% up; the plan has only Rampart.
    const { damage, hits } = autos([[10, 20_000, 10_000]], [use(1, 5_000)]);

    expect(damage.amountOf(hits[0])).toBe(16_000);
  });

  it('uses a shield up, auto by auto, but not one a mechanic broke', () => {
    const { damage, hits } = autos(
      [
        [11, 20_000, 0],
        [13, 20_000, 0],
        [21, 20_000, 0],
        [23, 20_000, 0],
      ],
      [use(2, 10_000), use(2, 20_000)],
      [BUSTER],
    );

    expect(hits.map(damage.amountOf)).toEqual([0, 15_000, 0, 20_000]);
  });

  it('leaves an auto the log has no damage before mitigation for as dealt', () => {
    const { damage, hits } = autos([[10, null, 12_000]], [use(1, 5_000)]);

    expect(damage.amountOf(hits[0])).toBe(12_000);
  });

  it('gives back what one more use takes off the autos it reaches', () => {
    const { damage, hits } = autos(
      [
        [10, 20_000, 20_000],
        [40, 20_000, 20_000],
      ],
      [],
    );

    expect(damage.add(use(1, 5_000))).toEqual([{ at: 10_000, player: 1, amount: 4_000 }]);
    expect(damage.amountOf(hits[0])).toBe(16_000);
  });
});
