import { Article } from './article';

// A new post pushed on GET /api/live, as the API shows it to someone who
// isn't signed in (favorited and author.following false).
export interface ArticleCreatedEvent {
  type: 'article-created';
  article: Article;
}
