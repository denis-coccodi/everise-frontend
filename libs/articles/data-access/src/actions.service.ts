import { HttpContext } from '@angular/common/http';
import { ProfileResponse, ArticleResponse, ArticleDiscordShareResponse } from '@everise/core/api-types';
import { SKIP_NOT_FOUND_REDIRECT } from '@everise/core/error-handler';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@everise/core/http-client';

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

  // Shares a post in the Everise Discord (its author or an admin). A post
  // deleted meanwhile is the button's to explain, not a move to the home page.
  shareToDiscord(articleId: string): Observable<ArticleDiscordShareResponse> {
    return this.apiService.post<ArticleDiscordShareResponse, void>(
      '/articles/' + encodeURIComponent(articleId) + '/discord',
      undefined,
      new HttpContext().set(SKIP_NOT_FOUND_REDIRECT, true),
    );
  }

  unfavorite(articleId: string): Observable<ArticleResponse> {
    return this.apiService.delete<ArticleResponse>('/articles/' + articleId + '/favorite');
  }
}
