import { Component, ChangeDetectionStrategy, computed, inject, effect, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ArticlesListStore, ListType, articlesListInitialState } from '@realworld/articles/data-access';
import { LiveUpdates } from '@realworld/core/http-client';
import { BannerComponent, ButtonComponent, TabComponent, TabsComponent } from '@realworld/ui/components';
import { TagsListComponent } from './tags-list/tags-list.component';
import { ArticleListComponent } from '@realworld/articles/feature-articles-list/src';
import { HomeStore } from './home.store';
import { countsForList, newPostsLabel } from './new-posts';

import { AuthStore } from '@realworld/auth/data-access';

@Component({
  selector: 'cdt-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [BannerComponent, ButtonComponent, TabsComponent, TabComponent, TagsListComponent, ArticleListComponent],
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

  // Posts published since the list was loaded, offered with a button rather
  // than added to the list while someone is reading it.
  protected readonly newPosts = signal(0);
  protected readonly newPostsLabel = computed(() => newPostsLabel(this.newPosts(), this.$listConfig()));

  readonly loadArticlesOnLogin = effect(() => {
    const isLoggedIn = this.authStore.loggedIn();
    untracked(() => this.getArticles(isLoggedIn));
  });

  constructor() {
    inject(LiveUpdates)
      .events$.pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (countsForList(event, this.$listConfig())) {
          this.newPosts.update((count) => count + 1);
        }
      });
  }

  setListTo(type: ListType = 'ALL') {
    const config = { ...articlesListInitialState.listConfig, type };
    this.articlesListStore.setListConfig(config);
    this.articlesListStore.loadArticles(this.$listConfig());
    this.newPosts.set(0);
  }

  getArticles(isLoggedIn: boolean) {
    if (isLoggedIn) {
      this.setListTo('FEED');
    } else {
      this.setListTo('ALL');
    }
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
    this.newPosts.set(0);
  }

  // Loads the new posts: the list again from the top, or the Global Feed
  // when they were announced on "Your Feed".
  showNewPosts() {
    const list = this.$listConfig();
    if (list.type === 'FEED') {
      this.setListTo('ALL');
    } else {
      this.articlesListStore.setListConfig({ ...list, currentPage: 1, filters: { ...list.filters, offset: 0 } });
      this.articlesListStore.loadArticles(this.$listConfig());
      this.newPosts.set(0);
    }
  }
}
