import { Service } from '@angular/core';
import type { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import type { Plan, PlanOptions } from './plan.model';
import type { PlanJob, PlanReply } from './plan-pool.model';
import { PullPlanner } from './pull-planner';

// At most this many plans are made at once, a worker each: the ways a pull
// is planned (`STRATEGIES`), with and without the user's edits.
const MOST_WORKERS = 6;
// Where there are no workers, the page plans one at a time, waiting this
// long first for the browser to draw.
const PAINT_MS = 50;

// Why a plan asked for never came: `stop` was called.
export const STOPPED = 'stopped';

interface Asked {
  timeline: PullTimeline;
  catalog: ActionCatalog;
  options: PlanOptions;
  done: (plan: Plan) => void;
  failed: (reason: unknown) => void;
}

// A worker (none where the browser has none: the page plans), the pull and
// catalog it holds, and the plan it's making.
interface Slot {
  worker: Worker | null;
  holds: string;
  busy: Asked | null;
}

// Plans pulls in web workers, several at once, so planning neither holds
// the page nor waits for one way of planning to end before the next starts.
// The work runs in the visitor's browser, as it always has.
@Service()
export class PlanPool {
  private readonly queue: Asked[] = [];
  private readonly slots: Slot[];
  private readonly local = new PullPlanner();
  // A number for each pull and catalog sent, so a worker holding them
  // isn't sent them again.
  private readonly ids = new WeakMap<object, number>();
  private sent = 0;

  constructor() {
    const workers = typeof Worker !== 'undefined';
    const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2;
    const size = workers ? Math.max(1, Math.min(MOST_WORKERS, cores - 1)) : 1;
    this.slots = Array.from({ length: size }, () => ({ worker: null, holds: '', busy: null }));
  }

  // The plan of the pull made as `options` say, once a worker is free.
  plan(timeline: PullTimeline, catalog: ActionCatalog, options: PlanOptions) {
    return new Promise<Plan>((done, failed) => {
      this.queue.push({ timeline, catalog, options, done, failed });
      this.next();
    });
  }

  // Drops every plan asked for and not yet made (their promises fail with
  // `STOPPED`), stopping the workers making them.
  stop() {
    for (const asked of this.queue.splice(0)) asked.failed(STOPPED);
    for (const slot of this.slots) {
      if (!slot.busy) continue;
      slot.busy.failed(STOPPED);
      slot.busy = null;
      slot.worker?.terminate();
      slot.worker = null;
      slot.holds = '';
    }
  }

  private next() {
    for (const slot of this.slots) {
      const asked = !slot.busy && this.queue.shift();
      if (!asked) continue;
      slot.busy = asked;
      if (typeof Worker === 'undefined') this.onPage(slot, asked);
      else this.inWorker(slot, asked);
    }
  }

  private inWorker(slot: Slot, asked: Asked) {
    const worker = (slot.worker ??= this.started(slot));
    const holds = `${this.idOf(asked.timeline)}:${this.idOf(asked.catalog)}`;
    const job: PlanJob = { options: asked.options };
    if (slot.holds !== holds) Object.assign(job, { timeline: asked.timeline, catalog: asked.catalog });
    slot.holds = holds;
    worker.postMessage(job);
  }

  private started(slot: Slot) {
    const worker = new Worker(new URL('./plan.worker', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<PlanReply>) => {
      const asked = this.finish(slot);
      if ('plan' in data) asked?.done(data.plan);
      else asked?.failed(new Error(data.error));
    };
    // A worker that didn't load or crashed: the next plan starts another.
    worker.onerror = (event) => {
      event.preventDefault();
      worker.terminate();
      slot.worker = null;
      slot.holds = '';
      this.finish(slot)?.failed(new Error(event.message || 'The planning worker stopped.'));
    };
    return worker;
  }

  private onPage(slot: Slot, asked: Asked) {
    setTimeout(() => {
      // Stopped meanwhile.
      if (slot.busy !== asked) return;
      try {
        const plan = this.local.plan(asked.timeline, asked.catalog, asked.options);
        this.finish(slot);
        asked.done(plan);
      } catch (e) {
        this.finish(slot);
        asked.failed(e);
      }
    }, PAINT_MS);
  }

  // The slot free again, the next plan asked for started: what it was making.
  private finish(slot: Slot) {
    const asked = slot.busy;
    slot.busy = null;
    this.next();
    return asked;
  }

  private idOf(o: object) {
    let id = this.ids.get(o);
    if (id === undefined) this.ids.set(o, (id = ++this.sent));
    return id;
  }
}
