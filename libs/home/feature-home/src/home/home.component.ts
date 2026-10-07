import { Component, ChangeDetectionStrategy, inject, effect, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ArticlesListStore, ListType, TagsStore, articlesListInitialState } from '@everise/articles/data-access';
import { LiveUpdates } from '@everise/core/http-client';
import {
  BannerComponent,
  CommunityLinksComponent,
  IconComponent,
  TabComponent,
  TabsComponent,
} from '@everise/ui/components';
import { DiscordWidgetComponent } from '../discord-widget/discord-widget.component';
import { TagsListComponent } from '../tags-list/tags-list.component';
import { ArticleListComponent } from '@everise/articles/articles-list';

import { AuthStore } from '@everise/auth/data-access';

@Component({
  selector: 'cdt-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [
    BannerComponent,
    CommunityLinksComponent,
    DiscordWidgetComponent,
    TabsComponent,
    TabComponent,
    TagsListComponent,
    ArticleListComponent,
    IconComponent,
  ],
  providers: [TagsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly articlesListStore = inject(ArticlesListStore);
  private readonly authStore = inject(AuthStore);
  private readonly tagsStore = inject(TagsStore);

  $listConfig = this.articlesListStore.listConfig;
  protected readonly isLoggedIn = this.authStore.loggedIn;
  $tags = this.tagsStore.tags;

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
