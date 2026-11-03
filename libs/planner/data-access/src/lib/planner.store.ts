import { computed, inject } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { patchState, signalStore, withComputed, withMethods, withProps, withState } from '@ngrx/signals';
import { PullTimeline, ReportPull } from '@everise/core/api-types';
import { errorMessageOf } from '@everise/core/data-access';
import {
  missingAttacks,
  referenceDamage,
  scriptMatches,
  upToWipePoint,
  type ReferencedTimeline,
} from '@everise/planner/scheduler';
import { concat, EMPTY, filter, forkJoin, last, map, of, switchMap, take, type Observable } from 'rxjs';
import { furtherPulls } from './further-pulls';
import { wipeCompletion } from './plan-completion';
import { PlannerService } from './planner.service';
import { readReportLink } from './report-link';
import type { EncounterPulls } from './planner.model';

// The fight planner's tool, for members: the FFLogs report and the pull
// picked, both in the query string (?report=<code>&pull=<id>) so a link
// opens the same, and the action catalog once a pull is open. Provided by
// the tool, which only members see.
export const PlannerStore = signalStore(
  withProps((_, service = inject(PlannerService), route = inject(ActivatedRoute)) => {
    const query = toSignal(route.queryParamMap, { requireSync: true });
    const code = computed(() => query().get('report') ?? undefined);
    const pullId = computed(() => {
      const pull = Number(query().get('pull'));
      return Number.isInteger(pull) && pull > 0 ? pull : undefined;
    });
    const report = rxResource({ params: code, stream: ({ params }) => service.report(params) });
    // Whether the pull picked is a wipe, once the report says (a pull it
    // doesn't list counts as a kill).
    const wiped = toObservable(
      computed(() => (report.hasValue() ? report.value().pulls.find((p) => p.id === pullId())?.kill === false : null)),
    ).pipe(
      filter((w) => w !== null),
      take(1),
    );
    // What completes a wipe: other groups' kills of its fight, else the
    // report's own pulls of it that got further, each up to its wipe point.
    const sources = (code: string, id: number) =>
      service.kills(code, id).pipe(
        last(undefined, [] as PullTimeline[]),
        switchMap((kills): Observable<Pick<ReferencedTimeline, 'clears' | 'clearsFrom'>> => {
          if (kills.length) return of({ clears: kills, clearsFrom: 'kills' });
          const further = furtherPulls(report.hasValue() ? report.value().pulls : [], id);
          const killed = new Set(further.filter((p) => p.kill).map((p) => p.id));
          return service
            .pulls(
              code,
              further.map((p) => p.id),
            )
            .pipe(
              map((read) => ({
                clears: read.map((t) => (killed.has(t.pullId) ? t : upToWipePoint(t))),
                clearsFrom: 'report',
              })),
            );
        }),
      );
    const pull = rxResource({
      params: computed(() => {
        const reportCode = code();
        const id = pullId();
        return reportCode && id ? { code: reportCode, id } : undefined;
      }),
      // Shown as soon as it's read, then again with what other groups' kills
      // add: for a wipe, what completes it (`sources`, and what they say of
      // its blocked attacks) and its fight's script, kept only if it's the
      // fight the log shows; for a kill, what an attack an invulnerability
      // blocked every time does, read only until it's found.
      stream: ({ params }) =>
        service.pull(params.code, params.id).pipe(
          switchMap((timeline): Observable<ReferencedTimeline> => {
            const missing = missingAttacks(timeline);
            const referenced = wiped.pipe(
              switchMap((wipe): Observable<ReferencedTimeline> => {
                if (wipe)
                  return forkJoin([sources(params.code, params.id), service.script(params.code, params.id)]).pipe(
                    map(([{ clears = [], clearsFrom }, script]) => ({
                      ...timeline,
                      clears,
                      clearsFrom,
                      script: script && scriptMatches(timeline, script) ? script : null,
                      ...(missing.length ? { references: referenceDamage(clears, missing) } : {}),
                    })),
                  );
                if (!missing.length) return EMPTY;
                return service
                  .references(params.code, params.id, missing)
                  .pipe(map((references) => ({ ...timeline, references })));
              }),
            );
            return concat(of(timeline), referenced);
          }),
        ),
    });
    // Asked for once, when the first pull is opened.
    const catalog = rxResource({
      params: computed(() => (pullId() ? true : undefined)),
      stream: () => service.catalog(),
    });
    return {
      code,
      pullId,
      report: report.asReadonly(),
      pull: pull.asReadonly(),
      catalog: catalog.asReadonly(),
    };
  }),
  withComputed(({ report, pull, catalog, pullId }) => ({
    // The report's pulls, a group per fight, in the order first pulled.
    encounters: computed<EncounterPulls[]>(() => (report.hasValue() ? byEncounter(report.value().pulls) : [])),
    // The pull picked, as the report lists it.
    picked: computed(() => (report.hasValue() ? (report.value().pulls.find((p) => p.id === pullId()) ?? null) : null)),
    reportError: computed(() => errorMessageOf(report)),
    pullError: computed(() => errorMessageOf(pull)),
    catalogError: computed(() => errorMessageOf(catalog)),
  })),
  // Whether a wipe's plan covers the whole fight, completed from another
  // group's kill (when it's offered and asked for), and the pull to plan:
  // completed so, or as logged.
  withState({ completeWipe: true }),
  withComputed(({ pull, catalog, picked, completeWipe }) => {
    const completion = computed(() =>
      pull.hasValue() && catalog.hasValue()
        ? wipeCompletion(pull.value(), picked()?.kill === false, catalog.value())
        : null,
    );
    const planned = computed((): ReferencedTimeline | null => {
      const c = completion();
      if (c?.state === 'offered' && completeWipe()) return c.timeline;
      return pull.hasValue() ? pull.value() : null;
    });
    return { completion, planned };
  }),
  withMethods((store, router = inject(Router), route = inject(ActivatedRoute)) => ({
    setCompleteWipe(completeWipe: boolean) {
      patchState(store, { completeWipe });
    },
    // Opens the report (and pull) a pasted link or code names; false when
    // it names none.
    open(link: string) {
      const read = readReportLink(link);
      if (!read) return false;
      void router.navigate([], { relativeTo: route, queryParams: { report: read.code, pull: read.pull } });
      return true;
    },
    pick(pullId: number) {
      void router.navigate([], { relativeTo: route, queryParams: { pull: pullId }, queryParamsHandling: 'merge' });
    },
  })),
);

function byEncounter(pulls: ReportPull[]): EncounterPulls[] {
  const groups = new Map<number, EncounterPulls>();
  for (const pull of pulls) {
    const group = groups.get(pull.encounterId);
    if (group) group.pulls.push(pull);
    else
      groups.set(pull.encounterId, { encounterId: pull.encounterId, name: pull.name, kind: pull.kind, pulls: [pull] });
  }
  // FFLogs names some fights of one duty alike (M12S's two are both
  // "Lindwurm"): the later ones are numbered, as its encounters are
  // ("Lindwurm II").
  const seen = new Map<string, number>();
  for (const group of groups.values()) {
    const n = (seen.get(group.name) ?? 0) + 1;
    seen.set(group.name, n);
    if (n > 1) group.name += ' ' + ROMAN[n - 1];
  }
  return [...groups.values()];
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
