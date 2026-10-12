import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Article } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { ArticlesListStore } from './articles-list.store';
import { ArticlesListConfig, articlesListInitialState } from './articles-list.model';

const post = (id: string, tagList: string[] = []) => ({ id, title: id, tagList }) as unknown as Article;

describe('ArticlesListStore.addLiveArticle', () => {
  let store: InstanceType<typeof ArticlesListStore>;

  function viewing(change: Partial<ArticlesListConfig> = {}, filters: ArticlesListConfig['filters'] = {}) {
    store.setListConfig({
      ...articlesListInitialState.listConfig,
      ...change,
      filters: { ...articlesListInitialState.listConfig.filters, limit: 3, ...filters },
    });
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '/api' }],
    });
    store = TestBed.inject(ArticlesListStore);
  });

  it("adds a new post at the top of the global feed's first page, keeping the page size", () => {
    viewing();
    for (const id of ['c', 'b', 'a']) store.addLiveArticle(post(id));

    expect(store.addLiveArticle(post('new'))).toBe(true);

    expect(store.articles.entities().map((a) => a.id)).toEqual(['new', 'a', 'b']);
    expect(store.articles.articlesCount()).toBe(4);
    expect(store.liveIds()).toContain('new');
  });

  it('adds a post once, and only where it belongs', () => {
    viewing();
    store.addLiveArticle(post('x'));
    expect(store.addLiveArticle(post('x'))).toBe(false);

    viewing({ type: 'FEED' });
    expect(store.addLiveArticle(post('y'))).toBe(false);
    viewing({ currentPage: 2 });
    expect(store.addLiveArticle(post('y'))).toBe(false);
    viewing({}, { author: 'Tataru' });
    expect(store.addLiveArticle(post('y'))).toBe(false);
    viewing({}, { tag: 'roulette' });
    expect(store.addLiveArticle(post('y', ['news']))).toBe(false);
    expect(store.addLiveArticle(post('z', ['roulette']))).toBe(true);
  });
});

describe('ArticlesListStore.followAuthor', () => {
  const author = (id: string, following = false) => ({ id, username: id, following, bio: null, image: '' });
  const by = (id: string, authorId: string) => ({ ...post(id), author: author(authorId) }) as unknown as Article;

  it("follows a post's author, and every post of theirs on the page shows it; unfollowing undoes it", () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '/api' }],
    });
    const store = TestBed.inject(ArticlesListStore);
    const http = TestBed.inject(HttpTestingController);
    store.setListConfig({ ...articlesListInitialState.listConfig });
    for (const article of [by('c', 'alisaie'), by('b', 'thancred'), by('a', 'alisaie')]) store.addLiveArticle(article);
    const following = () => store.articles.entities().map((a) => [a.id, a.author.following]);

    store.followAuthor('alisaie');
    const follow = http.expectOne('/api/profiles/alisaie/follow');
    expect(follow.request.method).toBe('POST');
    follow.flush({ profile: author('alisaie', true) });
    expect(following()).toEqual([
      ['a', true],
      ['b', false],
      ['c', true],
    ]);

    store.unfollowAuthor('alisaie');
    const unfollow = http.expectOne('/api/profiles/alisaie/follow');
    expect(unfollow.request.method).toBe('DELETE');
    unfollow.flush({ profile: author('alisaie', false) });
    expect(following()).toEqual([
      ['a', false],
      ['b', false],
      ['c', false],
    ]);
    http.verify();
  });
});
