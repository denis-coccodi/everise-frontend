import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { Article, Profile, ProfileResponse } from '@everise/core/api-types';
import { setLoaded, setLoading, withCallState } from '@everise/core/data-access';
import { Observable, concatMap, pipe, tap } from 'rxjs';
import {
  Articles,
  ArticlesListConfig,
  ArticlesListState,
  articlesListInitialState,
  belongsAtTop,
} from './articles-list.model';
import { ActionsService } from './actions.service';
import { ArticlesService } from './articles.service';

export const ArticlesListStore = signalStore(
  { providedIn: 'root' },
  withState<ArticlesListState>(articlesListInitialState),
  withComputed(({ listConfig, articles }) => ({
    totalPages: computed(() =>
      Array.from(
        new Array(Math.ceil(articles().articlesCount / (listConfig()?.filters?.limit ?? 1))),
        (_, index) => index + 1,
      ),
    ),
  })),
  withMethods((store, articlesService = inject(ArticlesService), actionsService = inject(ActionsService)) => {
    // Follows or stops following a post's author; every post of theirs on
    // the page shows the change. A failed call leaves the page as it was.
    const followMethod = (call: (id: string) => Observable<ProfileResponse>) =>
      rxMethod<string>(
        pipe(
          concatMap((authorId) =>
            call(authorId).pipe(
              tapResponse({
                next: ({ profile }) => patchState(store, { articles: withAuthor(store.articles(), profile) }),
                error: () => undefined,
              }),
            ),
          ),
        ),
      );
    return {
      followAuthor: followMethod((id) => actionsService.followUser(id)),
      unfollowAuthor: followMethod((id) => actionsService.unfollowUser(id)),
      loadArticles: rxMethod<ArticlesListConfig>(
        pipe(
          tap(() => setLoading('getArticles')),
          concatMap((listConfig) =>
            articlesService.query(listConfig).pipe(
              tapResponse({
                next: ({ articles, articlesCount }) => {
                  patchState(store, {
                    articles: {
                      articlesCount: articlesCount,
                      entities: articles,
                    },
                    liveIds: [],
                    ...setLoaded('getArticles'),
                  });
                },
                error: () => {
                  patchState(store, { ...articlesListInitialState, ...setLoaded('getArticles') });
                },
              }),
            ),
          ),
        ),
      ),
      favouriteArticle: rxMethod<string>(
        pipe(
          concatMap((articleId) =>
            actionsService.favorite(articleId).pipe(
              tapResponse({
                next: ({ article }) => {
                  patchState(store, {
                    articles: replaceArticle(store.articles(), article),
                  });
                },
                error: () => {
                  patchState(store, articlesListInitialState);
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
                  patchState(store, {
                    articles: replaceArticle(store.articles(), article),
                  });
                },
                error: () => {
                  patchState(store, articlesListInitialState);
                },
              }),
            ),
          ),
        ),
      ),
      // A post pushed by the backend: added at the top when it belongs in the
      // list being viewed (see belongsAtTop), keeping the page's size. Returns
      // whether it was added.
      addLiveArticle: (article: Article): boolean => {
        const current = store.articles();
        if (!belongsAtTop(article, store.listConfig()) || current.entities.some((a) => a.id === article.id)) {
          return false;
        }
        const limit = store.listConfig().filters.limit ?? 10;
        patchState(store, {
          articles: {
            articlesCount: current.articlesCount + 1,
            entities: [article, ...current.entities].slice(0, limit),
          },
          liveIds: [...store.liveIds(), article.id],
        });
        return true;
      },
      setListConfig: (listConfig: ArticlesListConfig) => {
        patchState(store, { listConfig });
      },
      setListPage: (page: number) => {
        const filters = {
          ...store.listConfig.filters(),
          offset: (store.listConfig().filters.limit ?? 10) * (page - 1),
        };
        const listConfig: ArticlesListConfig = {
          ...store.listConfig(),
          currentPage: page,
          filters,
        };
        patchState(store, { listConfig });
      },
    };
  }),
  withCallState({ collection: 'getArticles' }),
);

// The posts with their author's profile as it is now (e.g. followed).
function withAuthor(articles: Articles, author: Profile): Articles {
  return {
    ...articles,
    entities: articles.entities.map((article) =>
      article.author.id === author.id ? { ...article, author: { ...article.author, ...author } } : article,
    ),
  };
}

function replaceArticle(articles: Articles, payload: Article): Articles {
  const articleIndex = articles.entities.findIndex((a) => a.id === payload.id);
  const entities = [
    ...articles.entities.slice(0, articleIndex),
    Object.assign({}, articles.entities[articleIndex], payload),
    ...articles.entities.slice(articleIndex + 1),
  ];
  return { ...articles, entities };
}
