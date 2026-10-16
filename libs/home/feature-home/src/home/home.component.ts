import { Component, ChangeDetectionStrategy, computed, inject, effect, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ArticlesListStore, ListType, TagsStore, articlesListInitialState } from '@everise/articles/data-access';
import { LiveUpdates } from '@everise/core/http-client';
import {
  BannerComponent,
  ButtonComponent,
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

// The home page's tabs, each at its own address: Weekly at /, the others
// ?view=hunts, ?view=yours (members only) and ?view=global.
type HomeView = 'weekly' | 'hunts' | 'yours' | 'global';

// The posts each feed tab shows.
const FEEDS: Partial<Record<HomeView, ListType>> = { yours: 'FEED', global: 'ALL' };

// What screen readers hear before the tabs, per tab.
const VIEW_HEADINGS: Record<HomeView, string> = {
  weekly: 'This week',
  hunts: 'Hunt trains',
  yours: 'Your Feed',
  global: 'Posts',
};

@Component({
  selector: 'cdt-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [
    BannerComponent,
    ButtonComponent,
    NgTemplateOutlet,
    RouterLink,
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

  // The tab shown, from the address, so it can be linked and Back returns
  // to it. Your Feed is a member's: a guest gets the Global Feed.
  private readonly query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  protected readonly view = computed<HomeView>(() => {
    const view = this.query().get('view');
    if (view === 'yours') return this.authStore.loggedIn() ? 'yours' : 'global';
    return view === 'hunts' || view === 'global' ? view : 'weekly';
  });
  protected readonly viewHeading = computed(() => VIEW_HEADINGS[this.view()]);
  protected readonly isLoggedIn = this.authStore.loggedIn;
  $tags = this.tagsStore.tags;

  // Read out by screen readers when a post arrives live.
  protected readonly announcement = signal('');

  // Which posts are loaded (the feed, and whether signed in), if any.
  private feedLoaded = '';

  // A feed tab's posts load when it's shown (from a tab, a link, Back), and
  // again when signing in or out while it is (for the favourites).
  readonly loadArticlesOnLogin = effect(() => {
    const type = FEEDS[this.view()];
    const loggedIn = this.authStore.loggedIn();
    untracked(() => {
      if (type && this.feedLoaded !== `${type}:${loggedIn}`) {
        this.feedLoaded = `${type}:${loggedIn}`;
        this.setListTo(type);
      }
    });
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
    // The feed shown again (e.g. after a tag): its posts, unfiltered.
    const type = FEEDS[view];
    if (type && view === this.view()) this.setListTo(type);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: view === 'weekly' ? null : view },
      queryParamsHandling: 'merge',
    });
  }

  setListTo(type: ListType = 'ALL') {
    const config = { ...articlesListInitialState.listConfig, type };
    this.articlesListStore.setListConfig(config);
    this.articlesListStore.loadArticles(this.$listConfig());
  }

  // A tag from the sidebar: the posts with it, in the feeds.
  setListTag(tag: string) {
    this.feedLoaded = `ALL:${this.authStore.loggedIn()}`;
    void this.router.navigate([], { relativeTo: this.route, queryParams: { view: 'global' } });
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
