import type { MpShort, PlannedMp } from './mp.model';
import type { PlannedDeath } from './plan-deaths.model';

// A raised player's MP as they're back, a share of their max: as in the logs, 20% (about 2,000), all of it after a
// healer's Limit Break 3 (Pulse of Life).
const BACK_MP = 0.2;

// The plan's MP with its deaths (`withDeaths`): none from a death on, as the logs' MP drops to 0 there; back at
// `BACK_MP` when raised (all of it by Pulse of Life), the plan's own spending and regaining going on from there, within
// 0 and their max; and no MP short while they're dead (a dead white mage casts nothing). Drawn as planned before, a
// healer the plan let die at TOP's Cosmo Memory kept spending MP to the end of the fight.
export function mpWithDeaths(
  mp: PlannedMp[] | undefined,
  short: MpShort[] | undefined,
  deaths: PlannedDeath[],
  maxMp: Map<number, number | null>,
) {
  const dead = (player: number, at: number) =>
    deaths.some((d) => d.player === player && d.at <= at && at < (d.backAt ?? Infinity));
  const line = (player: number, points: { at: number; mp: number }[]) => {
    const own = deaths.filter((d) => d.player === player).sort((a, b) => a.at - b.at);
    const max = maxMp.get(player) ?? 0;
    if (!own.length || !max) return points;
    const at = (t: number) => [...points].reverse().find((p) => p.at <= t)?.mp ?? max;
    const out: { at: number; mp: number }[] = [];
    let [from, shift] = [-Infinity, 0];
    for (const d of [...own, null]) {
      const to = d?.at ?? Infinity;
      for (const p of points) {
        if (p.at >= from && p.at < to) out.push({ at: p.at, mp: Math.min(max, Math.max(0, p.mp - shift)) });
      }
      if (!d) break;
      out.push({ at: d.at, mp: 0 });
      if (d.backAt === null) return out;
      const back = (d.full ? 1 : BACK_MP) * max;
      out.push({ at: d.backAt, mp: back });
      [from, shift] = [d.backAt + 1, at(d.backAt) - back];
    }
    return out;
  };
  return {
    mp: mp?.map((m) => ({
      ...m,
      points: line(m.player, m.points),
      ...(m.spare ? { spare: line(m.player, m.spare) } : {}),
    })),
    mpShort: short?.filter((s) => !dead(s.player, s.at)),
  };
}
