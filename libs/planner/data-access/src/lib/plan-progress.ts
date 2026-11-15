// How far the plans being made have got together, for one progress bar:
// each plan an equal share of it, `report` hearing the whole (0 to 1).
export function progressOf(report: (share: number) => void) {
  const shares = new Map<string, number>();
  return {
    // A plan being made (by `key`), `plan` given what hears how far it has
    // got; done, its share is full.
    track<T>(key: string, plan: (report: (share: number) => void) => Promise<T>): Promise<T> {
      const hear = (share: number) => {
        shares.set(key, share);
        report([...shares.values()].reduce((a, b) => a + b, 0) / shares.size);
      };
      shares.set(key, 0);
      return plan(hear).then((made) => {
        hear(1);
        return made;
      });
    },
    // The next plans start a new bar, empty.
    clear() {
      shares.clear();
      report(0);
    },
  };
}
