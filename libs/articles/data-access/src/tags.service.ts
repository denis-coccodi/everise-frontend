import { TagsResponse } from '@everise/core/api-types';
import { ApiService } from '@everise/core/http-client';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TagsService {
  private readonly apiService = inject(ApiService);

  getTags(): Observable<TagsResponse> {
    return this.apiService.get('/tags');
  }
}
