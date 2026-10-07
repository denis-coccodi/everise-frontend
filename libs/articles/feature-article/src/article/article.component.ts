import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, input } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ArticleStore, NewComment } from '@everise/articles/data-access';
import { ArticleMetaComponent } from '../article-meta/article-meta.component';
import { ArticleCommentComponent } from '../article-comment/article-comment.component';
import { AddCommentComponent } from '../add-comment/add-comment.component';
import { RouterLink, Router } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import { API_URL, gameImageUrl } from '@everise/core/http-client';
import { MediaGridComponent, RichTextComponent } from '@everise/media';
import { BannerComponent, DutyCardComponent } from '@everise/ui/components';

@Component({
  selector: 'cdt-article',
  templateUrl: './article.component.html',
  styleUrl: './article.component.scss',
  imports: [
    MediaGridComponent,
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
  articleId = input<string>('');

  private readonly authStore = inject(AuthStore);
  private readonly articleStore = inject(ArticleStore);
  private readonly apiUrl = inject(API_URL);

  $article = this.articleStore.data;
  $comments = this.articleStore.comments;

  $authorId = this.articleStore.data.author.id;
  $isAuthenticated = this.authStore.loggedIn;
  $currentUser = this.authStore.user;
  $canModify = computed(() => this.authStore.user.id() === this.$authorId());

  constructor() {
    // The page's title is the article's, once it has loaded.
    const title = inject(Title);
    const router = inject(Router);
    effect(() => {
      const article = this.$article();
      const requested = this.articleId();
      if (!article.id || !article.title) return;
      if (article.id === requested) {
        title.setTitle(`${article.title} · Everise`);
      } else if (article.slug === requested) {
        // An old link, by the slug made from the title: the address becomes
        // the post's id, which every link uses now.
        router.navigate(['/article', article.id], { replaceUrl: true });
      }
    });
  }

  // A roulette card's game image.
  protected imageUrl(id: number | null | undefined) {
    return gameImageUrl(this.apiUrl, id);
  }

  ngOnInit() {
    this.articleStore.getArticle(this.articleId());
    this.articleStore.getComments(this.articleId());
  }

  follow(authorId: string) {
    this.articleStore.followUser(authorId);
  }
  unfollow(authorId: string) {
    this.articleStore.unfollowUser(authorId);
  }
  favorite(articleId: string) {
    this.articleStore.favouriteArticle(articleId);
  }
  unfavorite(articleId: string) {
    this.articleStore.unFavouriteArticle(articleId);
  }
  delete(articleId: string) {
    this.articleStore.deleteArticle(articleId);
  }
  deleteComment(data: { commentId: string; articleId: string }) {
    this.articleStore.deleteComment(data);
  }
  submit(comment: NewComment) {
    this.articleStore.addComment(comment);
  }
  ngOnDestroy() {
    this.articleStore.initializeArticle();
  }
}
