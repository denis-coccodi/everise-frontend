import { Article } from '@everise/core/api-types';

export interface ArticlesListState {
  listConfig: ArticlesListConfig;
  articles: Articles;
  // Posts that arrived live since the list was loaded.
  liveIds: string[];
}

export interface ArticlesListConfig {
  type: ListType;
  currentPage: number;
  filters: Filters;
}

export interface Filters {
  tag?: string;
  author?: string;
  favorited?: string;
  limit?: number;
  offset?: number;
}

export type ListType = 'ALL' | 'FEED';

export interface Articles {
  entities: Article[];
  articlesCount: number;
}

export const articlesListInitialState: ArticlesListState = {
  listConfig: {
    type: 'ALL',
    currentPage: 1,
    filters: {
      limit: 10,
    },
  },
  articles: {
    entities: [],
    articlesCount: 0,
  },
  liveIds: [],
};

// Whether a new post belongs at the top of this list: the newest posts of
// everyone, optionally on a tag. Not "Your Feed" (the page doesn't know whom
// you follow), an author's or favourites list, or a later page.
export function belongsAtTop(article: Article, list: ArticlesListConfig): boolean {
  const { tag, author, favorited } = list.filters;
  return (
    list.type === 'ALL' && list.currentPage === 1 && !author && !favorited && (!tag || article.tagList.includes(tag))
  );
}
