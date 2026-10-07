import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ArticleListItemComponent } from '../article-list-item/article-list-item.component';
import { PagerComponent } from '@everise/ui/components';
import { ArticlesListStore } from '@everise/articles/data-access';

@Component({
  selector: 'cdt-article-list',
  templateUrl: './article-list.component.html',
  styleUrl: './article-list.component.scss',
  imports: [ArticleListItemComponent, PagerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleListComponent {
  private readonly articlesListStore = inject(ArticlesListStore);

  $totalPages = this.articlesListStore.totalPages;
  $articles = this.articlesListStore.articles.entities;
  $listConfig = this.articlesListStore.listConfig;
  $isLoading = this.articlesListStore.getArticlesLoading;
  $liveIds = this.articlesListStore.liveIds;

  favorite(articleId: string) {
    this.articlesListStore.favouriteArticle(articleId);
  }

  unFavorite(articleId: string) {
    this.articlesListStore.unFavouriteArticle(articleId);
  }

  setPage(page: number) {
    this.articlesListStore.setListPage(page);
    this.articlesListStore.loadArticles(this.$listConfig());
  }
}
