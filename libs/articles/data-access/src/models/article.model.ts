import { Article, Comment } from '@realworld/core/api-types';

export interface ArticleState {
  data: Article;
  comments: Comment[];
}

export const articleInitialState: ArticleState = {
  data: {
    id: '',
    title: '',
    description: '',
    body: '',
    tagList: [],
    createdAt: '',
    updatedAt: '',
    favorited: false,
    favoritesCount: 0,
    author: {
      id: '',
      username: '',
      bio: '',
      image: '',
      following: false,
      loading: false,
    },
  },
  comments: [],
};
