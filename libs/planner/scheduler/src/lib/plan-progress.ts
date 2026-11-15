// The share of the bar the first pass at a plan fills: most plans need
// only that one, the rest share what's left (`PullPlanner.planWith`).
const FIRST_PASS = 0.6;
// A pass that takes more steps than expected waits here for its end.
const MOST_OF_A_PASS = 0.95;

// How far a plan made one way has got, reported as a share from 0 to 1 (a
// progress bar): it's planned in passes, the first one alone unless it
// leaves a hit short, each pass in steps (the mitigations and heals
// planned once). The share only grows.
export class PlanProgress {
  private passes = 1;
  private pass = 0;
  private steps = 1;
  private step = 0;
  private shown = 0;

  constructor(private readonly report?: (share: number) => void) {}

  // A plan of up to this many passes begins.
  begin(passes: number) {
    this.passes = Math.max(1, passes);
    this.pass = -1;
  }

  // The next pass begins, of about this many steps (its rounds, the
  // fairy's, a sage's Rhizomata, the Lucids: each a plan of the heals).
  nextPass(steps: number) {
    this.pass = Math.min(this.pass + 1, this.passes - 1);
    this.steps = Math.max(1, steps);
    this.step = 0;
    this.send();
  }

  // A step of the pass is done.
  stepDone() {
    this.step++;
    this.send();
  }

  private send() {
    if (!this.report) return;
    const within = Math.min(this.step / this.steps, MOST_OF_A_PASS);
    const share =
      this.pass <= 0
        ? FIRST_PASS * within
        : FIRST_PASS + ((1 - FIRST_PASS) * (this.pass - 1 + within)) / Math.max(1, this.passes - 1);
    if (share <= this.shown) return;
    this.shown = share;
    this.report(share);
  }
}
