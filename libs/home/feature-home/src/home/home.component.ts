import { Component, ChangeDetectionStrategy, computed, inject, effect, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
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
import { HuntsComponent, WeeklyComponent } from '@everise/relays/feature-relays';

import { AuthStore } from '@everise/auth/data-access';

type HomeView = 'feed' | 'weekly' | 'hunts';

// What screen readers hear before the tabs, per tab.
const VIEW_HEADINGS: Record<HomeView, string> = {
  feed: 'Posts',
  weekly: 'This week',
  hunts: 'Hunt trains',
};

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
    WeeklyComponent,
    HuntsComponent,
  ],
  providers: [TagsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly articlesListStore = inject(ArticlesListStore);
  private readonly authStore = inject(AuthStore);
  private readonly tagsStore = inject(TagsStore);

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  $listConfig = this.articlesListStore.listConfig;

  // The tab shown besides the feeds, from the address (?view=weekly or
  // ?view=hunts), so it can be linked and Back returns to it.
  private readonly query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  protected readonly view = computed<HomeView>(() => {
    const view = this.query().get('view');
    return view === 'weekly' || view === 'hunts' ? view : 'feed';
  });
  protected readonly viewHeading = computed(() => VIEW_HEADINGS[this.view()]);
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

  protected showView(view: HomeView) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: view === 'feed' ? null : view },
      queryParamsHandling: 'merge',
    });
  }

  // A feed tab shows the feeds again.
  protected showFeed(type: ListType) {
    this.showView('feed');
    this.setListTo(type);
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
