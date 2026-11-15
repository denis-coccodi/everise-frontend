import { PlanProgress } from './plan-progress';

describe('PlanProgress', () => {
  it('fills most of the bar in the first pass, the rest over the passes after it', () => {
    const shares: number[] = [];
    const progress = new PlanProgress((share) => shares.push(Math.round(share * 100)));

    progress.begin(3);
    progress.nextPass(2);
    progress.stepDone();
    progress.stepDone();
    progress.nextPass(4);
    progress.stepDone();
    progress.nextPass(1);
    progress.stepDone();

    // The first pass's 60%, its end waiting at 95% of that; then 20% each pass after it.
    expect(shares).toEqual([30, 57, 60, 65, 80, 99]);
  });

  it('never goes back, a pass with more steps than expected waiting near its end', () => {
    const shares: number[] = [];
    const progress = new PlanProgress((share) => shares.push(Math.round(share * 100)));

    progress.begin(1);
    progress.nextPass(1);
    progress.stepDone();
    progress.stepDone();
    progress.nextPass(1);

    expect(shares).toEqual([57]);
  });

  it('reports nothing without someone to hear it', () => {
    const progress = new PlanProgress();
    progress.begin(2);
    progress.nextPass(1);
    expect(() => progress.stepDone()).not.toThrow();
  });
});
