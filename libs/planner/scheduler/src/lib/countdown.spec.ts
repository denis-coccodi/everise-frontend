import { PlannerScheduler } from './planner-scheduler.service';
import { catalog, pull } from './scheduler-fixtures';

describe('the countdown', () => {
  it('puts mitigations and a shield up before the pull for a raidwide right at it, too soon for anything in it', () => {
    // 150,000 on the scholar 0.4s in: more than mitigation alone leaves room
    // for, and no time to put anything up in the pull.
    const p = new PlannerScheduler().plan(
      pull([
        [0.4, 'Opening Blast', 1, 60_000],
        [0.4, 'Opening Blast', 2, 150_000],
        [0.4, 'Opening Blast', 3, 60_000],
      ]),
      catalog(),
      { margin: 0.1 },
    );
    const before = p.uses.filter((u) => u.at < 0 && !u.opener);

    // Divine Veil's barrier among them, each of a player's a second apart.
    expect(before.map((u) => u.name)).toContain('Divine Veil');
    expect(before.every((u) => u.at >= -6_000 && u.at <= -3_000)).toBe(true);
    expect(p.hits.find((h) => h.player === 2)?.covers).toContain('Divine Veil');
  });
});
