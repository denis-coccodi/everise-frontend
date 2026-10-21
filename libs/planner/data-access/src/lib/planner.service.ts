import { HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ActionCatalog, FightReport, PlannerAvailable, PullTimeline } from '@everise/core/api-types';
import { SKIP_NOT_FOUND_REDIRECT } from '@everise/core/error-handler';
import { ApiService } from '@everise/core/http-client';

@Service()
export class PlannerService {
  private readonly api = inject(ApiService);

  // Whether the site has an FFLogs client, so the planner can be used.
  available() {
    return this.api.get<PlannerAvailable>('/planner/available');
  }

  // An FFLogs report's players and its Extreme, Savage and Ultimate pulls.
  // A report that isn't there (404) is the page's to explain.
  report(code: string) {
    return this.api.get<FightReport>(`/planner/reports/${encodeURIComponent(code)}`, undefined, notFoundIsThePages());
  }

  // Everything that happened in one of its pulls.
  pull(code: string, pullId: number) {
    return this.api.get<PullTimeline>(
      `/planner/reports/${encodeURIComponent(code)}/pulls/${pullId}`,
      undefined,
      notFoundIsThePages(),
    );
  }

  // The jobs' actions, with their heals and mitigations.
  catalog() {
    return this.api.get<ActionCatalog>('/planner/catalog');
  }
}

function notFoundIsThePages() {
  return new HttpContext().set(SKIP_NOT_FOUND_REDIRECT, true);
}
