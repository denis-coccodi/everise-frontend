import { Profile } from './profile';

// A roulette result posted to the feeds, built by the backend from its duty
// data. Images are ids for GET /api/images/:id (see gameImageUrl).
export interface RouletteCard {
  type: string;
  name: string;
  detail: string;
  mode: string;
  // A duty roulette: the game picks the duty.
  dutyUnknown: boolean;
  image: number | null;
  // The job dealt by dealer's choice.
  job: { name: string; icon: number } | null;
  // Posted by Tataru for someone who wasn't signed in.
  guest: boolean;
}

export interface Article {
  // What identifies the post in links and API paths. Never its title.
  id: string;
  // Only on posts from before ids were in links: what their old links used.
  slug?: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
  createdAt: string;
  updatedAt: string;
  favorited: boolean;
  favoritesCount: number;
  author: Profile;
  // Only on roulette results.
  roulette?: RouletteCard;
}

export interface CreateArticle {
  article: {
    title: string;
    description: string;
    body: string;
    tagList: string[];
  };
}

export type EditArticle = CreateArticle;

export interface ArticleResponse {
  article: Article;
}
