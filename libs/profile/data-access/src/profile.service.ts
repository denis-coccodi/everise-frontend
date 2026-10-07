import { Profile, ProfileResponse } from '@everise/core/api-types';
import { ApiService } from '@everise/core/http-client';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly apiService = inject(ApiService);

  getProfile(id: string): Observable<Profile> {
    return this.apiService
      .get<ProfileResponse>('/profiles/' + encodeURIComponent(id))
      .pipe(map((data) => data.profile));
  }
}
