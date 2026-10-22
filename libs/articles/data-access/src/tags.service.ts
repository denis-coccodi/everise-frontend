import { TagsResponse } from '@everise/core/api-types';
import { ApiService } from '@everise/core/http-client';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';

@Service()
export class TagsService {
  private readonly apiService = inject(ApiService);

  getTags(): Observable<TagsResponse> {
    return this.apiService.get('/tags');
  }
}
