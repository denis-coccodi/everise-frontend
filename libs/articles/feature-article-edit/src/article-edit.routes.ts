import { Routes } from '@angular/router';
import { AuthGuard } from '@realworld/auth/data-access';
import { ArticleEditComponent } from './article-edit.component';
import { articleEditResolver } from './resolvers/article-edit-resolver';

export const ARTICLE_EDIT_ROUTES: Routes = [
  {
    path: '',
    component: ArticleEditComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'New article',
        component: ArticleEditComponent,
        canActivate: [AuthGuard],
      },
      {
        path: ':slug',
        title: 'Edit article',
        component: ArticleEditComponent,
        resolve: { articleEditResolver },
      },
    ],
  },
];
