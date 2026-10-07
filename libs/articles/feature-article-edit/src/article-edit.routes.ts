import { Routes } from '@angular/router';
import { AuthGuard } from '@everise/auth/data-access';
import { ArticleEditComponent } from './article-edit/article-edit.component';
import { articleEditResolver } from './article-edit.resolver';

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
        path: ':articleId',
        title: 'Edit article',
        component: ArticleEditComponent,
        resolve: { articleEditResolver },
      },
    ],
  },
];
