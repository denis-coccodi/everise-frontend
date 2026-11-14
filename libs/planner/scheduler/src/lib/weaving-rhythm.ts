import type { GcdCast } from './weaving.model';

// A GCD's length when the log has too few to tell, and the range a measured
// one is kept in.
const USUAL_GCD_MS = 2_500;
const MIN_GCD_MS = 1_500;
const MAX_GCD_MS = 3_500;
// A gap this many GCDs long is one where GCDs were missed.
const GAP_GCDS = 1.5;

// A player's GCDs as played with their gaps filled: GCDs go one after the
// other, so where theirs stop for longer than a GCD and a half (moving, a
// late press), the plan has them carry on at their own rhythm (their usual
// GCD, skill or spell speed in it, and their usual cast time) up to their
// next. Not in `downtime` (nothing to target), nor across a death of theirs
// (`deaths`). The added ones are `filled`.
export function withRhythm(gcds: GcdCast[], downtime: { from: number; to: number }[], deaths: number[]): GcdCast[] {
  if (gcds.length < 2) return gcds;
  const { every, castMs } = rhythmOf(gcds);
  const down = (from: number, to: number) => downtime.some((d) => d.from < to && from < d.to);
  const out: GcdCast[] = [];
  gcds.forEach((g, i) => {
    out.push(g);
    const next = gcds[i + 1];
    if (!next || next.at - g.at <= GAP_GCDS * every) return;
    // Dead in it: until raised, which the log can't say for the plan.
    if (deaths.some((at) => at > g.at && at < next.at)) return;
    for (let at = g.at + every; next.at - at >= every; at += every) {
      if (down(at - every, at + every)) continue;
      out.push({ at, castMs, fullMs: castMs, filled: true });
    }
  });
  return out;
}

// A player's rhythm: their usual GCD (skill or spell speed in it) and usual
// cast time, from their GCDs as played.
export function rhythmOf(gcds: GcdCast[]) {
  const gaps = gcds
    .slice(1)
    .map((g, i) => g.at - gcds[i].at)
    .filter((gap) => gap >= MIN_GCD_MS && gap <= MAX_GCD_MS)
    .sort((a, b) => a - b);
  const casts = gcds.map((g) => g.castMs).sort((a, b) => a - b);
  return { every: gaps[gaps.length >> 1] ?? USUAL_GCD_MS, castMs: casts[casts.length >> 1] ?? 0 };
}

// A player's GCDs at their rhythm from where they act freely (`free`: past a
// completed wipe's wipe point, with nobody of their job in the kill) to the
// pull's end, but in downtime: they carry on with their rotation, so their
// oGCDs are woven after GCDs, as always.
export function rhythmFrom(
  gcds: GcdCast[],
  rhythm: { every: number; castMs: number },
  free: number | undefined,
  endsAt: number,
  downtime: { from: number; to: number }[],
): GcdCast[] {
  if (free === undefined || !Number.isFinite(endsAt)) return [];
  const last = [...gcds].reverse().find((g) => g.at < free)?.at ?? free - rhythm.every;
  const out: GcdCast[] = [];
  for (let at = last + rhythm.every; at < endsAt; at += rhythm.every) {
    if (at < free || downtime.some((d) => d.from <= at && at <= d.to)) continue;
    out.push({ at, castMs: rhythm.castMs, fullMs: rhythm.castMs, filled: true });
  }
  return out;
}

// A GCD this much sooner than the player's usual one after the last only
// landed then: its cast bar began earlier.
const LANDED_SHARE = 0.75;

// Which of a player's GCDs as played (in time order) only landed then: an
// instant one sooner than three quarters of their usual GCD before the
// next, its cast begun earlier (in the countdown).
export function landedGcds(gcds: { at: number; castMs: number | null }[]) {
  const gaps = gcds.slice(1).map((g, i) => g.at - gcds[i].at);
  const usual = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
  return gcds.flatMap((g, i) => (!g.castMs && i < gaps.length && gaps[i] < usual * LANDED_SHARE ? [i] : []));
}
