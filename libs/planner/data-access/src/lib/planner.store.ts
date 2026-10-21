import { computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { ReportPull } from '@everise/core/api-types';
import { errorMessageOf } from '@everise/core/data-access';
import { PlannerService } from './planner.service';
import { readReportLink } from './report-link';

// The pulls of one fight (an encounter), in the order they were pulled.
export interface EncounterPulls {
  encounterId: number;
  name: string;
  kind: ReportPull['kind'];
  pulls: ReportPull[];
}

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
    const pull = rxResource({
      params: computed(() => {
        const reportCode = code();
        const id = pullId();
        return reportCode && id ? { code: reportCode, id } : undefined;
      }),
      stream: ({ params }) => service.pull(params.code, params.id),
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
    picked: computed(() => (report.hasValue() ? report.value().pulls.find((p) => p.id === pullId()) ?? null : null)),
    reportError: computed(() => errorMessageOf(report)),
    pullError: computed(() => errorMessageOf(pull)),
    catalogError: computed(() => errorMessageOf(catalog)),
  })),
  withMethods((_, router = inject(Router), route = inject(ActivatedRoute)) => ({
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
  return [...groups.values()];
}
