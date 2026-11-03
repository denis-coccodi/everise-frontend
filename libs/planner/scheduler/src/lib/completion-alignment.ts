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
// The latest pairs whose median gap is the offset.
const OFFSET_PAIRS = 5;
const AUTO_ATTACK = /^attack$/i;

// Where the wipe and one of the kills line up best: groups push phases at
// different times, so each kill is matched against the wipe by the order
// of the boss's casts (the sequence both share, closest in time), anchored
// on the latest cast they share. The kill whose anchor comes latest in the wipe
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

// The latest pair of the sequence of casts `wipe` and `clear` share in
// order that lines them up best: each pair is worth more the closer in
// time its two casts are (1 at the same moment, 0 at `MAX_DRIFT_MS`), so
// where a fight repeats its casts the copy in step wins over one a pattern
// later. On real kills cut short, every alignment over 8 s off was such a
// wrong copy, completing almost none of the fight right.
function anchor(wipe: Cast[], clear: Cast[]) {
  const n = wipe.length;
  const m = clear.length;
  const width = m + 1;
  const worth = (a: Cast, b: Cast) =>
    a.name === b.name && Math.abs(a.at - b.at) < MAX_DRIFT_MS ? 1 - Math.abs(a.at - b.at) / MAX_DRIFT_MS : 0;
  // best[i * width + j]: the best worth of wipe[..i) and clear[..j), with
  // how many pairs (count) and the step taken there (0: a pair; 1: past a
  // wipe cast; 2: past a kill cast).
  const best = new Float64Array((n + 1) * width);
  const count = new Int32Array((n + 1) * width);
  const step = new Uint8Array((n + 1) * width);
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      const k = i * width + j;
      const w = worth(wipe[i - 1], clear[j - 1]);
      const [paired, up, left] = [w ? best[k - width - 1] + w : -1, best[k - width], best[k - 1]];
      if (paired >= up && paired >= left) [best[k], count[k], step[k]] = [paired, count[k - width - 1] + 1, 0];
      else if (up >= left) [best[k], count[k], step[k]] = [up, count[k - width], 1];
      else [best[k], count[k], step[k]] = [left, count[k - 1], 2];
    }
  const matched = count[n * width + m];
  if (matched < MIN_MATCHED) return null;
  // Back from the end over the last pairs taken: the latest is the anchor,
  // their median gap the offset, so one stray pair at the end can't set it.
  const gaps: number[] = [];
  let last: { name: string; wipeAt: number } | null = null;
  let [i, j] = [n, m];
  while (i > 0 && j > 0 && gaps.length < OFFSET_PAIRS) {
    const k = i * width + j;
    if (step[k] === 0) {
      last ??= { name: wipe[i - 1].name, wipeAt: wipe[i - 1].at };
      gaps.push(wipe[i - 1].at - clear[j - 1].at);
      i--;
      j--;
    } else if (step[k] === 1) i--;
    else j--;
  }
  if (!last) return null;
  return { ...last, clearAt: last.wipeAt - median(gaps), matched };
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
