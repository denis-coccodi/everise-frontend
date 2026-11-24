// A GCD locks its player out of other actions this long when it's instant; an oGCD, `WEAVE_MS` (weaving.ts).
const GCD_LOCK_MS = 600;
const WEAVE_MS = 700;
// Timing noise allowed in a gap between two GCDs.
const SLACK_MS = 100;

// Whether the gap between two GCDs a moment falls in already has the oGCDs it fits: two, a third only in a gap of
// 2.7s or more (a GCD's lock, then each oGCD's). Their oGCDs as played can sit closer than `WEAVE_MS` apart, which
// left room in time for a third where no player has any; the plan's check (`weavesShort`) counts the same way.
// `gcds` and `ogcds` are what takes the player's time (`Weaving`'s busy stretches).
export function weavesFull(gcds: { from: number }[], ogcds: { from: number }[]): (t: number) => boolean {
  const starts = gcds.map((g) => g.from).sort((a, b) => a - b);
  return (t) => {
    const prev = starts.filter((s) => s <= t).at(-1);
    const next = starts.find((s) => s > t);
    if (prev === undefined || next === undefined) return false;
    const fits = Math.max(2, Math.floor((next - prev - GCD_LOCK_MS + SLACK_MS) / WEAVE_MS));
    return ogcds.filter((b) => b.from >= prev && b.from < next).length >= fits;
  };
}
