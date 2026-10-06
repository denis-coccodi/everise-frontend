import { Injectable, inject } from '@angular/core';
import { ArticleResponse } from '@realworld/core/api-types';
import { API_URL, ApiService, gameImageUrl } from '@realworld/core/http-client';
import { catchError, forkJoin, map, of } from 'rxjs';
import { DutyGroupsResponse, JobsResponse, RoulettePostRequest, RoulettesResponse } from './duties.models';

@Injectable({ providedIn: 'root' })
export class DutiesService {
  private readonly apiService = inject(ApiService);
  private readonly apiUrl = inject(API_URL);

  getDutyLists() {
    return forkJoin({
      duties: this.apiService.get<DutyGroupsResponse>('/duties'),
      roulettes: this.apiService.get<RoulettesResponse>('/roulettes'),
      // The roulette works without jobs, only without dealer's choice.
      jobs: this.apiService
        .get<JobsResponse>('/jobs')
        .pipe(catchError(() => of<JobsResponse>({ fetchedAt: null, jobs: [] }))),
    }).pipe(
      map(({ duties, roulettes, jobs }) => ({
        fetchedAt: duties.fetchedAt,
        dayEndsAt: dayEndsAt(duties),
        groups: duties.groups,
        roulettes: roulettes.roulettes,
        rouletteIcon: roulettes.icon ?? null,
        jobs: jobs.jobs,
      })),
    );
  }

  // The duties again, for the next game day's Frontline map.
  getDutyGroups() {
    return this.apiService
      .get<DutyGroupsResponse>('/duties')
      .pipe(map((duties) => ({ groups: duties.groups, dayEndsAt: dayEndsAt(duties) })));
  }

  // Where the backend serves a game image, by its id.
  imageUrl(id: number | null | undefined): string | undefined {
    return gameImageUrl(this.apiUrl, id);
  }

  // Posts an accepted result to the feeds: as the signed-in user, or by
  // Tataru for a guest. The backend checks it and builds the card.
  postResult(request: RoulettePostRequest) {
    return this.apiService.post<ArticleResponse, RoulettePostRequest>('/roulette-results', request);
  }
}

function dayEndsAt(duties: DutyGroupsResponse) {
  return duties.dayEndsAt ? new Date(duties.dayEndsAt) : null;
}
