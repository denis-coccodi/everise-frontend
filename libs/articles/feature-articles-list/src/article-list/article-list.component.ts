import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ArticleListItemComponent } from '../article-list-item/article-list-item.component';
import { PagerComponent } from '@everise/ui/components';
import { ArticlesListStore } from '@everise/articles/data-access';
import { AuthStore } from '@everise/auth/data-access';
import { Article } from '@everise/core/api-types';

@Component({
  selector: 'cdt-article-list',
  templateUrl: './article-list.component.html',
  styleUrl: './article-list.component.scss',
  imports: [ArticleListItemComponent, PagerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleListComponent {
  private readonly articlesListStore = inject(ArticlesListStore);
  private readonly authStore = inject(AuthStore);

  $totalPages = this.articlesListStore.totalPages;
  $articles = this.articlesListStore.articles.entities;
  $listConfig = this.articlesListStore.listConfig;
  $isLoading = this.articlesListStore.getArticlesLoading;
  $liveIds = this.articlesListStore.liveIds;

  // A signed-in member can follow a post's author: another member, not
  // themselves or a Waking Sands character.
  canFollow(article: Article) {
    const author = article.author;
    return this.authStore.loggedIn() && author.id !== this.authStore.user.id() && !author.character;
  }

  follow(authorId: string) {
    this.articlesListStore.followAuthor(authorId);
  }

  unfollow(authorId: string) {
    this.articlesListStore.unfollowAuthor(authorId);
  }

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
