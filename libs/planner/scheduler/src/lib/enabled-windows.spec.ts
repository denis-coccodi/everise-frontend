import { pull } from './scheduler-fixtures';
import { withEnablerWindows } from './enabled-windows';

describe('withEnablerWindows', () => {
  it('has Lux Solaris usable only in the 30s from each Refulgent Lux its summoner had', () => {
    const t = pull([]);
    const aura = (from: number, to: number, target = 4) => ({
      status: 3874,
      source: target,
      target,
      from,
      to,
      stacks: null,
      shield: null,
    });
    // Spent after 5s at 60s; another player's doesn't count.
    t.auras.push(aura(60_000, 65_000), aura(180_000, 210_000), aura(100_000, 130_000, 5));
    type Tool = { player: number; action: number; away?: { from: number; to: number }[] };
    const tools: Tool[] = [
      { player: 4, action: 36997 },
      { player: 4, action: 7560 },
    ];

    const [lux, addle] = withEnablerWindows(t, tools);

    expect(lux.away).toEqual([
      { from: -Infinity, to: 60_000 },
      { from: 90_000, to: 180_000 },
      { from: 210_000, to: Infinity },
    ]);
    expect(addle).toBe(tools[1]);
  });

  it('has it away the whole pull without the status', () => {
    expect(
      withEnablerWindows(pull([]), [
        { player: 4, action: 36997 } as { player: number; action: number; away?: { from: number; to: number }[] },
      ])[0].away,
    ).toEqual([{ from: -Infinity, to: Infinity }]);
  });

  it("puts Soteria's heals on whoever has the sage's Kardion", () => {
    const t = pull([]);
    t.auras.push({ status: 2605, source: 2, target: 1, from: 0, to: 300_000, stacks: null, shield: null });

    const [soteria] = withEnablerWindows(t, [
      { player: 2, action: 24294 } as { player: number; action: number; kardion?: unknown },
    ]);

    expect(soteria.kardion).toEqual([{ from: 0, to: 300_000, player: 1 }]);
  });
});
