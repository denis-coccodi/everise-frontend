import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, input } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ArticleStore } from '@realworld/articles/data-access';
import { ArticleMetaComponent } from './article-meta/article-meta.component';
import { ArticleCommentComponent } from './article-comment/article-comment.component';
import { AddCommentComponent } from './add-comment/add-comment.component';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@realworld/auth/data-access';
import { API_URL, gameImageUrl } from '@realworld/core/http-client';
import { RichTextComponent } from '@realworld/media';
import { BannerComponent, DutyCardComponent } from '@realworld/ui/components';

@Component({
  selector: 'cdt-article',
  templateUrl: './article.component.html',
  styleUrl: './article.component.scss',
  imports: [
    BannerComponent,
    DutyCardComponent,
    ArticleMetaComponent,
    ArticleCommentComponent,
    RichTextComponent,
    AddCommentComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleComponent implements OnInit, OnDestroy {
  slug = input<string>('');

  private readonly authStore = inject(AuthStore);
  private readonly articleStore = inject(ArticleStore);
  private readonly apiUrl = inject(API_URL);

  $article = this.articleStore.data;
  $comments = this.articleStore.comments;

  $authorUsername = this.articleStore.data.author.username;
  $isAuthenticated = this.authStore.loggedIn;
  $currentUser = this.authStore.user;
  $canModify = computed(() => this.authStore.user.username() === this.$authorUsername());

  constructor() {
    // The page's title is the article's, once it has loaded.
    const title = inject(Title);
    effect(() => {
      const article = this.$article();
      if (article.slug === this.slug() && article.title) {
        title.setTitle(`${article.title} · Everise`);
      }
    });
  }

  // A roulette card's game image.
  protected imageUrl(id: number | null | undefined) {
    return gameImageUrl(this.apiUrl, id);
  }

  ngOnInit() {
    this.articleStore.getArticle(this.slug());
    this.articleStore.getComments(this.slug());
  }

  follow(username: string) {
    this.articleStore.followUser(username);
  }
  unfollow(username: string) {
    this.articleStore.unfollowUser(username);
  }
  favorite(slug: string) {
    this.articleStore.favouriteArticle(slug);
  }
  unfavorite(slug: string) {
    this.articleStore.unFavouriteArticle(slug);
  }
  delete(slug: string) {
    this.articleStore.deleteArticle(slug);
  }
  deleteComment(data: { commentId: number; slug: string }) {
    this.articleStore.deleteComment(data);
  }
  submit(comment: string) {
    this.articleStore.addComment(comment);
  }
  ngOnDestroy() {
    this.articleStore.initializeArticle();
  }
}
