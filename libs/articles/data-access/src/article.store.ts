import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { CreateArticle, EditArticle } from '@everise/core/api-types';
import { setLoaded, setLoading, withCallState } from '@everise/core/data-access';
import { FormErrorsStore } from '@everise/core/forms';
import { concatMap, pipe, switchMap, tap } from 'rxjs';
import { ArticleState, articleInitialState } from './article.model';
import { ActionsService } from './actions.service';
import { ArticlesService, NewComment } from './articles.service';

export const ArticleStore = signalStore(
  { providedIn: 'root' },
  withState<ArticleState>(articleInitialState),
  withMethods(
    (
      store,
      articlesService = inject(ArticlesService),
      actionsService = inject(ActionsService),
      router = inject(Router),
      formErrorsStore = inject(FormErrorsStore),
    ) => ({
      getArticle: rxMethod<string>(
        pipe(
          switchMap((articleId) => {
            patchState(store, { data: articleInitialState.data, ...setLoading('getArticle') });
            return articlesService.getArticle(articleId).pipe(
              tapResponse({
                next: ({ article }) => {
                  patchState(store, { data: article, ...setLoaded('getArticle') });
                },
                error: () => {
                  patchState(store, { data: articleInitialState.data, ...setLoaded('getArticle') });
                },
              }),
            );
          }),
        ),
      ),
      getComments: rxMethod<string>(
        pipe(
          switchMap((articleId) => {
            patchState(store, { comments: articleInitialState.comments, ...setLoading('getComments') });
            return articlesService.getComments(articleId).pipe(
              tapResponse({
                next: ({ comments }) => {
                  patchState(store, { comments: comments, ...setLoaded('getComments') });
                },
                error: () => {
                  patchState(store, { comments: articleInitialState.comments, ...setLoaded('getComments') });
                },
              }),
            );
          }),
        ),
      ),
      followUser: rxMethod<string>(
        pipe(
          switchMap((authorId) => actionsService.followUser(authorId)),
          tap(({ profile }) => patchState(store, { data: { ...store.data(), author: profile } })),
        ),
      ),
      unfollowUser: rxMethod<string>(
        pipe(
          switchMap((authorId) => actionsService.unfollowUser(authorId)),
          tap(({ profile }) => patchState(store, { data: { ...store.data(), author: profile } })),
        ),
      ),
      favouriteArticle: rxMethod<string>(
        pipe(
          concatMap((articleId) =>
            actionsService.favorite(articleId).pipe(
              tapResponse({
                next: ({ article }) => {
                  patchState(store, { data: article });
                },
                error: () => {
                  patchState(store, articleInitialState);
                },
              }),
            ),
          ),
        ),
      ),
      unFavouriteArticle: rxMethod<string>(
        pipe(
          concatMap((articleId) =>
            actionsService.unfavorite(articleId).pipe(
              tapResponse({
                next: ({ article }) => {
                  patchState(store, { data: article });
                },
                error: () => {
                  patchState(store, articleInitialState);
                },
              }),
            ),
          ),
        ),
      ),
      deleteComment: rxMethod<{ commentId: string; articleId: string }>(
        pipe(
          switchMap(({ commentId, articleId }) =>
            articlesService
              .deleteComment(commentId, articleId)
              .pipe(
                tap(() => patchState(store, { comments: store.comments().filter((item) => item.id !== commentId) })),
              ),
          ),
        ),
      ),
      deleteArticle: rxMethod<string>(
        pipe(
          switchMap((articleId) =>
            articlesService.deleteArticle(articleId).pipe(
              tapResponse({
                next: () => router.navigate(['/']),
                error: () => patchState(store, articleInitialState),
              }),
            ),
          ),
        ),
      ),
      addComment: rxMethod<NewComment>(
        pipe(
          switchMap((addedComment) =>
            articlesService.addComment(store.data.id(), addedComment).pipe(
              tapResponse({
                next: ({ comment }) => patchState(store, { comments: [comment, ...store.comments()] }),
                error: (response: HttpErrorResponse) => formErrorsStore.setResponseErrors(response),
              }),
            ),
          ),
        ),
      ),
      publishArticle: rxMethod<CreateArticle>(
        pipe(
          switchMap((article) =>
            articlesService.publishArticle(article).pipe(
              tapResponse({
                next: ({ article }) => router.navigate(['article', article.id]),
                error: (response: HttpErrorResponse) => formErrorsStore.setResponseErrors(response),
              }),
            ),
          ),
        ),
      ),
      editArticle: rxMethod<{ editArticle: EditArticle; articleId: string }>(
        pipe(
          switchMap(({ editArticle, articleId }) =>
            articlesService.editArticle(editArticle, articleId).pipe(
              tapResponse({
                next: ({ article }) => router.navigate(['article', article.id]),
                error: (response: HttpErrorResponse) => formErrorsStore.setResponseErrors(response),
              }),
            ),
          ),
        ),
      ),
      initializeArticle: () => {
        patchState(store, articleInitialState);
      },
    }),
  ),
  withCallState({ collection: 'getArticle' }),
  withCallState({ collection: 'getComments' }),
);
