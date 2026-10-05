import { ArticlesListConfig } from '@realworld/articles/data-access';
import { LiveEvent } from '@realworld/core/http-client';

// Whether a new post belongs in the list being viewed. On "Your Feed" every
// new post counts, offered as "new in the Global Feed" (the page doesn't know
// whom you follow); on a tag, only posts with that tag.
export function countsForList(event: LiveEvent, list: ArticlesListConfig): boolean {
  if (event.type !== 'article-created') return false;
  const tag = list.filters.tag;
  return list.type === 'FEED' || !tag || event.tags.includes(tag);
}

// The button's text, e.g. "3 new posts: show them".
export function newPostsLabel(count: number, list: ArticlesListConfig): string {
  const posts = count === 1 ? '1 new post' : `${count} new posts`;
  const where = list.type === 'FEED' ? ' in the Global Feed' : '';
  return `${posts}${where}: show ${count === 1 ? 'it' : 'them'}`;
}
