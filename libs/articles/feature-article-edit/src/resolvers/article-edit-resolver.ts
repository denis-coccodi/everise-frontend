import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { ArticleStore } from '@realworld/articles/data-access/src';
import { of } from 'rxjs';

export const articleEditResolver: ResolveFn<boolean> = (route: ActivatedRouteSnapshot) => {
  const articleId = route.params['articleId'];
  const articleStore = inject(ArticleStore);

  if (articleId) {
    articleStore.getArticle(articleId);
  }

  return of(true);
};
