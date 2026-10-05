import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ArticleListItemComponent } from './article-list-item/article-list-item.component';
import { PagerComponent } from '@realworld/ui/components';
import { ArticlesListStore } from '@realworld/articles/data-access';

@Component({
  selector: 'cdt-article-list',
  templateUrl: './article-list.component.html',
  imports: [ArticleListItemComponent, PagerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleListComponent {
  private readonly articlesListStore = inject(ArticlesListStore);

  $totalPages = this.articlesListStore.totalPages;
  $articles = this.articlesListStore.articles.entities;
  $listConfig = this.articlesListStore.listConfig;
  $isLoading = this.articlesListStore.getArticlesLoading;

  favorite(slug: string) {
    this.articlesListStore.favouriteArticle(slug);
  }

  unFavorite(slug: string) {
    this.articlesListStore.unFavouriteArticle(slug);
  }

  setPage(page: number) {
    this.articlesListStore.setListPage(page);
    this.articlesListStore.loadArticles(this.$listConfig());
  }
}
