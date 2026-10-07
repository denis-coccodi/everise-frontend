import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { ArticlesListStore, articlesListInitialState } from '@everise/articles/data-access';
import { of } from 'rxjs';

export const profileArticlesResolver: ResolveFn<boolean> = (route: ActivatedRouteSnapshot) => {
  const id = route.params['id'];
  const articlesListStore = inject(ArticlesListStore);

  const config = {
    ...articlesListInitialState.listConfig,
    filters: {
      ...articlesListInitialState.listConfig.filters,
      author: id,
    },
  };

  articlesListStore.setListConfig(config);
  articlesListStore.loadArticles(config);

  return of(true);
};
