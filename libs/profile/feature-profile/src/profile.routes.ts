import { inject } from '@angular/core';
import { ResolveFn, Routes } from '@angular/router';
import { ProfileService } from '@realworld/profile/data-access';
import { map } from 'rxjs';
import { ArticleListComponent } from '@realworld/articles/feature-articles-list/src';
import { AuthGuard } from '@realworld/auth/data-access';
import { profileArticlesResolver, profileFavoritesResolver, profileResolver } from '@realworld/profile/data-access';
import { ProfileComponent } from './profile.component';

// The page title names the member, read from their profile: the link only
// has their id.
const titleOf =
  (what: string): ResolveFn<string> =>
  (route) =>
    inject(ProfileService)
      .getProfile(route.paramMap.get('id') ?? route.parent?.paramMap.get('id') ?? '')
      .pipe(map((profile) => `${profile.username}'s ${what}`));

export const PROFILE_ROUTES: Routes = [
  {
    path: ':id',
    title: titleOf('articles'),
    component: ProfileComponent,
    resolve: { profileResolver },
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: ArticleListComponent,
        resolve: { profileArticlesResolver },
      },
      {
        path: 'favorites',
        title: titleOf('favorited articles'),
        component: ArticleListComponent,
        resolve: { profileFavoritesResolver },
      },
    ],
  },
];
