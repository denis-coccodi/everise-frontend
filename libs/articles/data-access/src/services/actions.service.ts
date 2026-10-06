import { ProfileResponse, ArticleResponse } from '@realworld/core/api-types';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@realworld/core/http-client';

@Injectable({ providedIn: 'root' })
export class ActionsService {
  private readonly apiService = inject(ApiService);

  followUser(id: string): Observable<ProfileResponse> {
    return this.apiService.post<ProfileResponse, void>('/profiles/' + encodeURIComponent(id) + '/follow');
  }

  unfollowUser(id: string): Observable<ProfileResponse> {
    return this.apiService.delete<ProfileResponse>('/profiles/' + encodeURIComponent(id) + '/follow');
  }

  favorite(articleId: string): Observable<ArticleResponse> {
    return this.apiService.post<ArticleResponse, void>('/articles/' + articleId + '/favorite');
  }

  unfavorite(articleId: string): Observable<ArticleResponse> {
    return this.apiService.delete<ArticleResponse>('/articles/' + articleId + '/favorite');
  }
}
