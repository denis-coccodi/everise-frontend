import { Injectable, inject } from '@angular/core';
import { API_URL, ApiService } from '@realworld/core/http-client';
import { catchError, forkJoin, map, of } from 'rxjs';
import { DutyGroupsResponse, JobsResponse, RoulettesResponse } from './duties.models';

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
        groups: duties.groups,
        roulettes: roulettes.roulettes,
        rouletteIcon: roulettes.icon ?? null,
        jobs: jobs.jobs,
      })),
    );
  }

  // Where the backend serves a game image, by its id.
  imageUrl(id: number | null | undefined): string | undefined {
    return id ? `${this.apiUrl}/images/${id}` : undefined;
  }
}
