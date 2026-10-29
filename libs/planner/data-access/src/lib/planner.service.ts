import { HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ActionCatalog, FightReport, PlannerAvailable, PlannerClears, PullTimeline } from '@everise/core/api-types';
import { referenceDamage, type ReferenceDamage } from '@everise/planner/scheduler';
import { catchError, concatMap, EMPTY, from, last, map, of, scan, switchMap, takeWhile, type Observable } from 'rxjs';
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

  // What other groups' kills of the pull's fight say `attacks` do (those an
  // invulnerability blocked every time in the pull): read in turn, one that
  // won't load (gone private) skipped, until each is found or none is left.
  // Empty when FFLogs ranks none, or can't be reached.
  references(code: string, pullId: number, attacks: string[]): Observable<ReferenceDamage> {
    const clears = this.api.get<PlannerClears>(`/planner/reports/${encodeURIComponent(code)}/pulls/${pullId}/clears`);
    return clears.pipe(
      switchMap(({ clears }) => from(clears)),
      concatMap((c) => this.pull(c.code, c.pullId).pipe(catchError(() => EMPTY))),
      scan((read: PullTimeline[], timeline) => [...read, timeline], []),
      map((read) => referenceDamage(read, attacks)),
      takeWhile((found) => attacks.some((a) => !found[a]), true),
      last(undefined, {} as ReferenceDamage),
      catchError(() => of({} as ReferenceDamage)),
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
