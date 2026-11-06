import type { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import { PlanPool, STOPPED } from './plan-pool.service';
import type { PlanJob, PlanReply } from './plan-pool.model';
import type { Plan, PlanOptions } from './plan.model';
import { PullPlanner } from './pull-planner';

const timeline = {} as PullTimeline;
const catalog = {} as ActionCatalog;
const options = (margin: number) => ({ margin }) as PlanOptions;
const planned = (margin: number) => ({ uses: [], hits: [], mechanics: [], unplaced: [], hp: [], margin }) as Plan;

// A worker that answers only when the test says so.
class FakeWorker {
  static made: FakeWorker[] = [];
  readonly sent: PlanJob[] = [];
  terminated = false;
  onmessage: ((event: { data: PlanReply }) => void) | null = null;
  onerror: unknown = null;
  constructor() {
    FakeWorker.made.push(this);
  }
  postMessage(job: PlanJob) {
    this.sent.push(job);
  }
  terminate() {
    this.terminated = true;
  }
  answer(reply: PlanReply) {
    this.onmessage?.({ data: reply });
  }
}

describe('PlanPool', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    FakeWorker.made = [];
  });

  it('plans on the page, one at a time, where the browser has no workers', async () => {
    vi.stubGlobal('Worker', undefined);
    const plan = vi.spyOn(PullPlanner.prototype, 'plan').mockImplementation((_t, _c, o) => planned(o.margin));
    const pool = new PlanPool();

    const plans = await Promise.all([
      pool.plan(timeline, catalog, options(1)),
      pool.plan(timeline, catalog, options(2)),
    ]);

    expect(plans.map((p) => (p as Plan & { margin: number }).margin)).toEqual([1, 2]);
    expect(plan).toHaveBeenCalledTimes(2);
  });

  it('makes plans side by side in workers, sending the pull to each worker once', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('navigator', { hardwareConcurrency: 3 });
    const pool = new PlanPool();

    const first = [1, 2].map((m) => pool.plan(timeline, catalog, options(m)));
    const queued = pool.plan(timeline, catalog, options(3));
    // Two workers (a core left for the page), the third plan waiting.
    expect(FakeWorker.made.length).toBe(2);
    FakeWorker.made[0].answer({ plan: planned(1) });
    FakeWorker.made[1].answer({ plan: planned(2) });
    await Promise.all(first);
    FakeWorker.made[0].answer({ plan: planned(3) });

    expect(await queued).toEqual(planned(3));
    const [a] = FakeWorker.made;
    expect(a.sent.map((j) => [!!j.timeline, j.options.margin])).toEqual([
      [true, 1],
      [false, 3],
    ]);
  });

  it('fails a plan with the reason the worker gives', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const pool = new PlanPool();

    const asked = pool.plan(timeline, catalog, options(1));
    FakeWorker.made[0].answer({ error: 'No pull to plan.' });

    await expect(asked).rejects.toThrow('No pull to plan.');
  });

  it('drops every plan asked for when stopped, ending the workers making them', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('navigator', { hardwareConcurrency: 2 });
    const pool = new PlanPool();

    const asked = [1, 2].map((m) => pool.plan(timeline, catalog, options(m)));
    pool.stop();

    for (const a of asked) await expect(a).rejects.toBe(STOPPED);
    expect(FakeWorker.made[0].terminated).toBe(true);
    // A new plan starts a new worker, sent the pull again.
    void pool.plan(timeline, catalog, options(3)).catch(() => undefined);
    expect(FakeWorker.made.length).toBe(2);
    expect(FakeWorker.made[1].sent[0].timeline).toBe(timeline);
  });
});
