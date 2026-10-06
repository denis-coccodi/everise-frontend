import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@realworld/core/http-client';
import {
  Article,
  ArticleResponse,
  CreateArticle,
  EditArticle,
  MultipleCommentsResponse,
  SingleCommentResponse,
} from '@realworld/core/api-types';
import { HttpParams } from '@angular/common/http';
import { ArticlesListConfig } from '../models/articles-list.model';

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

  addComment(articleId: string, comment: string): Observable<SingleCommentResponse> {
    return this.apiService.post<SingleCommentResponse, { comment: { body: string } }>(
      `/articles/${articleId}/comments`,
      {
        comment: { body: comment },
      },
    );
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

  // TODO: remove any
  private toHttpParams(params: any) {
    return Object.getOwnPropertyNames(params).reduce((p, key) => p.set(key, params[key]), new HttpParams());
  }
}
