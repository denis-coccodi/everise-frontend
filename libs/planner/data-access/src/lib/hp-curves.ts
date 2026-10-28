import { PullTimeline } from '@everise/core/api-types';
import type { Plan } from '@everise/planner/scheduler';
import type { HpCurve, HpMark, HpPoint } from './hp-curves.model';

// Each player's HP over the pull, for those the log says the max HP of: as
// played, and with the plan once there is one, with their deaths, the hits
// the plan leaves short and the failed mechanics it takes as avoided.
//
// As played, the log's HP after each hit sets it (a heal's snapshot isn't
// reliable: heals landing together all carry the same), each heal adds what
// it healed (overheal left out), and a death takes it to 0.
export function hpCurves(timeline: PullTimeline, plan: Plan | null): HpCurve[] {
  const mechanicOf = new Map(plan?.mechanics.map((m) => [m.id, m]) ?? []);
  const curves: HpCurve[] = [];
  for (const player of timeline.players) {
    const max = player.maxHp;
    if (!max) continue;
    const planned = plan?.hp.find((h) => h.player === player.id);
    const mp = plan?.mp?.find((m) => m.player === player.id);
    const maxMp = player.maxMp ?? 0;
    const share = (hp: number) => Math.min(1, Math.max(0, hp / max));
    const marks: HpMark[] = timeline.deaths
      .filter((d) => d.player === player.id)
      .map((d) => ({ at: d.at, share: 0, kind: 'death', action: null }));
    for (const hit of plan?.hits.filter((h) => h.player === player.id) ?? []) {
      const m = mechanicOf.get(hit.mechanic);
      if (!m || (hit.safe && !hit.avoidable)) continue;
      const left = hit.avoidable ? (hit.hpBefore ?? max) : Math.max(0, (hit.hpBefore ?? max) - hit.planned);
      marks.push({ at: m.at, share: share(left), kind: hit.avoidable ? 'avoided' : 'short', action: m.name });
    }
    curves.push({
      id: player.id,
      name: player.name,
      job: player.job,
      played: played(timeline, player.id, max),
      planned: planned ? planned.points.map((p) => ({ at: p.at, share: share(p.hp) })) : null,
      mp: mp?.points.length && maxMp ? mp.points.map((p) => ({ at: p.at, share: Math.min(1, p.mp / maxMp) })) : null,
      marks: marks.sort((a, b) => a.at - b.at),
    });
  }
  return curves;
}

function played(timeline: PullTimeline, player: number, max: number): HpPoint[] {
  const events = [
    ...timeline.damage.filter((h) => h.target === player).map((h) => ({ at: h.at, set: h.hp, add: -h.amount })),
    ...timeline.heals.filter((h) => h.target === player).map((h) => ({ at: h.at, set: null, add: h.amount })),
    ...timeline.deaths.filter((d) => d.player === player).map((d) => ({ at: d.at, set: 0, add: 0 })),
  ].sort((a, b) => a.at - b.at);
  const points: HpPoint[] = [{ at: 0, share: 1 }];
  let hp = max;
  for (const e of events) {
    hp = Math.min(max, Math.max(0, e.set ?? hp + e.add));
    const last = points.at(-1) as HpPoint;
    if (last.at === e.at) last.share = hp / max;
    else points.push({ at: e.at, share: hp / max });
  }
  return points;
}

// A curve's HP at `at`: the last point at or before it.
export function shareAt(points: HpPoint[], at: number) {
  let share = points[0]?.share ?? 1;
  for (const p of points) {
    if (p.at > at) break;
    share = p.share;
  }
  return share;
}

// A curve's lowest point (the first, if it's there more than once); null
// for none.
export function lowest(points: HpPoint[]): HpPoint | null {
  let low: HpPoint | null = null;
  for (const p of points) if (!low || p.share < low.share) low = p;
  return low;
}

// A curve to draw: its lowest HP in each `bucketMs` from the start, so the
// dips that matter stay and a tick's jitter goes.
export function lowestPerBucket(points: HpPoint[], durationMs: number, bucketMs: number): HpPoint[] {
  const drawn: HpPoint[] = [];
  let i = 0;
  let share = points[0]?.share ?? 1;
  for (let from = 0; from < durationMs; from += bucketMs) {
    let low = share;
    for (; i < points.length && points[i].at < from + bucketMs; i++) {
      share = points[i].share;
      low = Math.min(low, share);
    }
    drawn.push({ at: from, share: low });
  }
  drawn.push({ at: durationMs, share });
  return drawn;
}
