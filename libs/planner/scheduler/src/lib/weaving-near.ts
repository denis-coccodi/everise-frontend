// How far from the moments asked about a player's actions can still bear
// on them: longer than any cast bar, lock or late GCD's gap. Only those
// are looked at (`Weaving`), the rest of the pull left out.
const NEAR_MS = 15_000;

// Those of `list` near `lo` to `hi`, by `at`.
export function near<T>(list: T[], lo: number, hi: number, at = (t: T) => (t as { at: number }).at) {
  return list.filter((t) => at(t) >= lo - NEAR_MS && at(t) <= hi + NEAR_MS);
}

// Those of `list`, sorted by `at`, near `lo` to `hi`: as `near`, found by
// halving rather than looking at each.
export function nearSorted<T extends { at: number }>(list: T[], lo: number, hi: number) {
  const first = (t: number) => {
    let [a, b] = [0, list.length];
    while (a < b) {
      const m = (a + b) >> 1;
      if (list[m].at < t) a = m + 1;
      else b = m;
    }
    return a;
  };
  return list.slice(first(lo - NEAR_MS), first(hi + NEAR_MS + 1));
}

// The first index of `list` (sorted by `at`) whose `at` passes `after`: found by halving.
export function firstIndex<T>(list: T[], after: (t: T) => boolean) {
  let [a, b] = [0, list.length];
  while (a < b) {
    const m = (a + b) >> 1;
    if (after(list[m])) b = m;
    else a = m + 1;
  }
  return a;
}

// Those of `list`, sorted by `at`, near `lo` to `hi`: exactly `near`'s, found by halving.
export function nearExact<T extends { at: number }>(list: T[], lo: number, hi: number) {
  return list.slice(
    firstIndex(list, (t) => t.at >= lo - NEAR_MS),
    firstIndex(list, (t) => t.at > hi + NEAR_MS),
  );
}

// `item` into `list`, sorted by `at`, after any at the same moment.
export function insertByAt<T extends { at: number }>(list: T[], item: T) {
  list.splice(
    firstIndex(list, (t) => t.at > item.at),
    0,
    item,
  );
  return list;
}
