import { Component, ChangeDetectionStrategy, inject, effect, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ArticlesListStore, ListType, articlesListInitialState } from '@realworld/articles/data-access';
import { LiveUpdates } from '@realworld/core/http-client';
import { BannerComponent, CommunityLinksComponent, TabComponent, TabsComponent } from '@realworld/ui/components';
import { TagsListComponent } from './tags-list/tags-list.component';
import { ArticleListComponent } from '@realworld/articles/feature-articles-list/src';
import { HomeStore } from './home.store';

import { AuthStore } from '@realworld/auth/data-access';

@Component({
  selector: 'cdt-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [
    BannerComponent,
    CommunityLinksComponent,
    TabsComponent,
    TabComponent,
    TagsListComponent,
    ArticleListComponent,
  ],
  providers: [HomeStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly articlesListStore = inject(ArticlesListStore);
  private readonly authStore = inject(AuthStore);
  private readonly homeStore = inject(HomeStore);

  $listConfig = this.articlesListStore.listConfig;
  protected readonly isLoggedIn = this.authStore.loggedIn;
  $tags = this.homeStore.tags;

  // Read out by screen readers when a post arrives live.
  protected readonly announcement = signal('');

  readonly loadArticlesOnLogin = effect(() => {
    this.authStore.loggedIn();
    untracked(() => this.getArticles());
  });

  // New posts pushed by the backend go straight to the top of the list
  // when they belong in it.
  constructor() {
    inject(LiveUpdates)
      .events$.pipe(takeUntilDestroyed())
      .subscribe(({ article }) => {
        if (this.articlesListStore.addLiveArticle(article)) {
          this.announcement.set(`New post by ${article.author.username}: ${article.title}`);
        }
      });
  }

  setListTo(type: ListType = 'ALL') {
    const config = { ...articlesListInitialState.listConfig, type };
    this.articlesListStore.setListConfig(config);
    this.articlesListStore.loadArticles(this.$listConfig());
  }

  // Everyone starts on the Global Feed: "Your Feed" only shows people you
  // follow, which is empty until you follow someone. Signing in or out
  // reloads it, for the favourites.
  getArticles() {
    this.setListTo('ALL');
  }

  setListTag(tag: string) {
    this.articlesListStore.setListConfig({
      ...articlesListInitialState.listConfig,
      filters: {
        ...articlesListInitialState.listConfig.filters,
        tag,
      },
    });
    this.articlesListStore.loadArticles(this.$listConfig());
  }
}
