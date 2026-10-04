import { Injectable, inject } from '@angular/core';
import { ApiService } from '@realworld/core/http-client';
import { forkJoin, map } from 'rxjs';
import { DutyGroupsResponse, RoulettesResponse } from './duties.models';

@Injectable({ providedIn: 'root' })
export class DutiesService {
  private readonly apiService = inject(ApiService);

  getDutyLists() {
    return forkJoin({
      duties: this.apiService.get<DutyGroupsResponse>('/duties'),
      roulettes: this.apiService.get<RoulettesResponse>('/roulettes'),
    }).pipe(
      map(({ duties, roulettes }) => ({
        fetchedAt: duties.fetchedAt,
        groups: duties.groups,
        roulettes: roulettes.roulettes,
      })),
    );
  }
}
