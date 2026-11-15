import { progressOf } from './plan-progress';

describe('progressOf', () => {
  it('shows the plans being made together, each an equal share, a finished one full', async () => {
    const shares: number[] = [];
    const progress = progressOf((share) => shares.push(share));
    let hearA: (share: number) => void = () => undefined;
    let finishB: (plan: string) => void = () => undefined;

    const a = progress.track('a', (report) => ((hearA = report), new Promise<string>(() => undefined)));
    const b = progress.track('b', () => new Promise<string>((done) => (finishB = done)));
    hearA(0.5);
    finishB('plan b');

    expect(await b).toBe('plan b');
    expect(shares).toEqual([0.25, 0.75]);
    void a;
  });

  it('starts an empty bar when cleared', () => {
    const shares: number[] = [];
    const progress = progressOf((share) => shares.push(share));

    void progress.track('a', (report) => (report(1), new Promise<string>(() => undefined)));
    progress.clear();

    expect(shares).toEqual([1, 0]);
  });
});
