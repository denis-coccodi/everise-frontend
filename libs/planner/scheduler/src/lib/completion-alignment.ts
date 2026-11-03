import type { PullTimeline } from '@everise/core/api-types';
import type { Alignment } from './completion.model';

// Fewer shared casts than this could line up on a cast the fight repeats
// anywhere, so no alignment is trusted.
const MIN_MATCHED = 3;
// The same cast from several of the boss's copies at once counts once.
const SAME_CAST_MS = 1000;
// Anchors this close in the wipe are as good as each other: about a GCD.
const SAME_ANCHOR_MS = 2500;
// How far apart two groups can be at one cast: phases pushed sooner or
// later add up over a fight. Real Savage wipes were within 6 s of a kill;
// 90 s let one line up on a cast the fight repeats 90 s later.
const MAX_DRIFT_MS = 60_000;
const AUTO_ATTACK = /^attack$/i;

// Where the wipe and one of the kills line up best: groups push phases at
// different times, so each kill is matched against the wipe by the order
// of the boss's casts (the longest sequence both share), anchored on the
// latest cast they share. The kill whose anchor comes latest in the wipe
// wins; between anchors a GCD apart, the kill nearest the kills' median
// length, so one slow group's longer fight doesn't set the rest. Null when
// none shares enough. A wipe that outlasted the kill gets an `endsAt`
// before its own end: nothing is left to add.
export function alignment(wipe: PullTimeline, clears: PullTimeline[]): Alignment | null {
  const casts = castsOf(wipe);
  const typical = median(clears.map((c) => c.durationMs));
  const fromTypical = (a: Alignment) => Math.abs(clears[a.clear].durationMs - typical);
  let best: Alignment | null = null;
  clears.forEach((clear, i) => {
    const found = anchor(casts, castsOf(clear));
    if (!found) return;
    const offset = found.wipeAt - found.clearAt;
    const candidate = { ...found, clear: i, offset, endsAt: clear.durationMs + offset };
    if (
      !best ||
      candidate.wipeAt - best.wipeAt > SAME_ANCHOR_MS ||
      (Math.abs(candidate.wipeAt - best.wipeAt) <= SAME_ANCHOR_MS && fromTypical(candidate) < fromTypical(best))
    )
      best = candidate;
  });
  return best;
}

interface Cast {
  name: string;
  at: number;
}

// The boss's (and adds') casts in order, by name, without auto-attacks.
function castsOf(timeline: PullTimeline): Cast[] {
  const names = new Map(timeline.actions.map((a) => [a.id, a.name]));
  const out: Cast[] = [];
  for (const cast of [...timeline.enemyCasts].sort((a, b) => a.at - b.at)) {
    const name = names.get(cast.action);
    if (!name || AUTO_ATTACK.test(name)) continue;
    let k = out.length - 1;
    while (k >= 0 && cast.at - out[k].at < SAME_CAST_MS && out[k].name !== name) k--;
    if (k >= 0 && cast.at - out[k].at < SAME_CAST_MS) continue;
    out.push({ name, at: cast.at });
  }
  return out;
}

// The pair that can end a longest shared sequence of `wipe` and `clear`:
// the latest in the wipe, and the earliest in the kill for it (so a cast
// the kill repeats later in the fight isn't taken for this one). Only
// casts within `MAX_DRIFT_MS` of each other pair up: otherwise a sequence
// can stretch over a fight's repeats and line a wipe's third minute up
// with a kill's seventh.
function anchor(wipe: Cast[], clear: Cast[]) {
  const n = wipe.length;
  const m = clear.length;
  const width = m + 1;
  const same = (a: Cast, b: Cast) => a.name === b.name && Math.abs(a.at - b.at) <= MAX_DRIFT_MS;
  // shared[i * width + j]: the longest shared sequence of wipe[..i) and clear[..j).
  const shared = new Int32Array((n + 1) * width);
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      shared[i * width + j] = same(wipe[i - 1], clear[j - 1])
        ? shared[(i - 1) * width + j - 1] + 1
        : Math.max(shared[(i - 1) * width + j], shared[i * width + j - 1]);
  const matched = shared[n * width + m];
  if (matched < MIN_MATCHED) return null;
  for (let i = n; i >= 1; i--)
    for (let j = 1; j <= m; j++)
      if (same(wipe[i - 1], clear[j - 1]) && shared[(i - 1) * width + j - 1] + 1 === matched)
        return { name: wipe[i - 1].name, wipeAt: wipe[i - 1].at, clearAt: clear[j - 1].at, matched };
  return null;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
