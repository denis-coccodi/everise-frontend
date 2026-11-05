import { HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  ActionCatalog,
  FightReport,
  FightScript,
  FightScriptResponse,
  PlannerAvailable,
  PlannerClears,
  PullTimeline,
} from '@everise/core/api-types';
import { referenceDamage, withAttackNames, type ReferenceDamage } from '@everise/planner/scheduler';
import {
  catchError,
  concatMap,
  EMPTY,
  from,
  last,
  map,
  of,
  scan,
  switchMap,
  takeWhile,
  toArray,
  type Observable,
} from 'rxjs';
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

  // Everything that happened in one of its pulls, its attacks named for
  // people (auto-attacks "Attack", unnamed ones by id: `withAttackNames`).
  pull(code: string, pullId: number) {
    return this.api
      .get<PullTimeline>(
        `/planner/reports/${encodeURIComponent(code)}/pulls/${pullId}`,
        undefined,
        notFoundIsThePages(),
      )
      .pipe(map(withAttackNames));
  }

  // Several of a report's pulls, read in turn, one that won't load skipped.
  pulls(code: string, pullIds: number[]): Observable<PullTimeline[]> {
    return from(pullIds).pipe(
      concatMap((id) => this.pull(code, id).pipe(catchError(() => EMPTY))),
      toArray(),
    );
  }

  // Other groups' kills of the pull's fight, as they're read: in turn, one
  // that won't load (archived, gone private) skipped, until `enough` says
  // so or none is left. Nothing when FFLogs ranks none, or can't be reached.
  kills(code: string, pullId: number, enough: (read: PullTimeline[]) => boolean = () => false) {
    const clears = this.api.get<PlannerClears>(`/planner/reports/${encodeURIComponent(code)}/pulls/${pullId}/clears`);
    return clears.pipe(
      switchMap(({ clears }) => from(clears)),
      concatMap((c) => this.pull(c.code, c.pullId).pipe(catchError(() => EMPTY))),
      scan((read: PullTimeline[], timeline) => [...read, timeline], []),
      takeWhile((read) => !enough(read), true),
      catchError(() => EMPTY),
    );
  }

  // What those kills say `attacks` do (those an invulnerability blocked
  // every time in the pull): read until each is found or none is left.
  // Empty when none is.
  references(code: string, pullId: number, attacks: string[]): Observable<ReferenceDamage> {
    return this.kills(code, pullId, (read) => allFound(referenceDamage(read, attacks), attacks)).pipe(
      map((read) => referenceDamage(read, attacks)),
      last(undefined, {} as ReferenceDamage),
    );
  }

  // The pull's fight's script (cactbot's timeline). Null when cactbot has
  // none for it yet, or it can't be read: the plan does without.
  script(code: string, pullId: number): Observable<FightScript | null> {
    return this.api
      .get<FightScriptResponse>(`/planner/reports/${encodeURIComponent(code)}/pulls/${pullId}/script`)
      .pipe(
        map(({ script }) => script),
        catchError(() => of(null)),
      );
  }

  // The jobs' actions, with their heals and mitigations.
  catalog() {
    return this.api.get<ActionCatalog>('/planner/catalog');
  }
}

function allFound(references: ReferenceDamage, attacks: string[]) {
  return attacks.every((a) => references[a]);
}

function notFoundIsThePages() {
  return new HttpContext().set(SKIP_NOT_FOUND_REDIRECT, true);
}
