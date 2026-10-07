import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@everise/core/http-client';
import {
  Article,
  ArticleResponse,
  CreateArticle,
  EditArticle,
  MultipleCommentsResponse,
  NewAttachment,
  SingleCommentResponse,
} from '@everise/core/api-types';
import { HttpParams } from '@angular/common/http';
import { ArticlesListConfig, Filters } from './articles-list.model';

// A comment as written: text, and at most one attachment.
export interface NewComment {
  body: string;
  media: NewAttachment[];
}

@Injectable({ providedIn: 'root' })
export class ArticlesService {
  private readonly apiService = inject(ApiService);

  getArticle(articleId: string): Observable<ArticleResponse> {
    return this.apiService.get<ArticleResponse>('/articles/' + articleId);
  }

  getComments(articleId: string): Observable<MultipleCommentsResponse> {
    return this.apiService.get<MultipleCommentsResponse>(`/articles/${articleId}/comments`);
  }

  deleteArticle(articleId: string): Observable<void> {
    return this.apiService.delete<void>('/articles/' + articleId);
  }

  deleteComment(commentId: string, articleId: string): Observable<void> {
    return this.apiService.delete<void>(`/articles/${articleId}/comments/${commentId}`);
  }

  addComment(articleId: string, comment: NewComment): Observable<SingleCommentResponse> {
    return this.apiService.post<SingleCommentResponse, { comment: NewComment }>(`/articles/${articleId}/comments`, {
      comment,
    });
  }

  query(config: ArticlesListConfig): Observable<{ articles: Article[]; articlesCount: number }> {
    return this.apiService.get(
      '/articles' + (config.type === 'FEED' ? '/feed' : ''),
      this.toHttpParams(config.filters),
    );
  }

  publishArticle(article: CreateArticle): Observable<ArticleResponse> {
    return this.apiService.post<ArticleResponse, CreateArticle>('/articles/', article);
  }

  editArticle(article: EditArticle, articleId: string): Observable<ArticleResponse> {
    return this.apiService.put<ArticleResponse, EditArticle>('/articles/' + articleId, article);
  }

  // The filters that are set, as query parameters.
  private toHttpParams(filters: Filters) {
    return Object.entries(filters).reduce(
      (params, [key, value]) => (value === undefined ? params : params.set(key, value)),
      new HttpParams(),
    );
  }
}
