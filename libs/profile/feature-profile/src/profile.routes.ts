import { Routes } from '@angular/router';
import { ArticleListComponent } from '@realworld/articles/feature-articles-list/src';
import { AuthGuard } from '@realworld/auth/data-access';
import { profileArticlesResolver, profileFavoritesResolver, profileResolver } from '@realworld/profile/data-access';
import { ProfileComponent } from './profile.component';

export const PROFILE_ROUTES: Routes = [
  {
    path: ':username',
    title: (route) => `${route.paramMap.get('username')}'s articles`,
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
        title: (route) => `${route.parent?.paramMap.get('username')}'s favorited articles`,
        component: ArticleListComponent,
        resolve: { profileFavoritesResolver },
      },
    ],
  },
];
