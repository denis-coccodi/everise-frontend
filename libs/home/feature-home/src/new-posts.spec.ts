import { ArticlesListConfig } from '@realworld/articles/data-access';
import { LiveEvent } from '@realworld/core/http-client';
import { countsForList, newPostsLabel } from './new-posts';

const list = (type: 'ALL' | 'FEED', tag?: string): ArticlesListConfig => ({
  type,
  currentPage: 1,
  filters: { limit: 10, ...(tag ? { tag } : {}) },
});
const post = (tags: string[]): LiveEvent => ({ type: 'article-created', slug: 's', author: 'Tataru', tags });

describe('new posts', () => {
  it('counts every new post on the global feed and on your feed', () => {
    expect(countsForList(post(['roulette']), list('ALL'))).toBe(true);
    expect(countsForList(post([]), list('FEED'))).toBe(true);
  });

  it('counts only posts with the tag being viewed', () => {
    expect(countsForList(post(['roulette']), list('ALL', 'roulette'))).toBe(true);
    expect(countsForList(post(['news']), list('ALL', 'roulette'))).toBe(false);
  });

  it('says how many, and where on your feed', () => {
    expect(newPostsLabel(1, list('ALL'))).toBe('1 new post: show it');
    expect(newPostsLabel(3, list('ALL'))).toBe('3 new posts: show them');
    expect(newPostsLabel(2, list('FEED'))).toBe('2 new posts in the Global Feed: show them');
  });
});
