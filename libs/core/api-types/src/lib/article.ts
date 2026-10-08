import { Schemas } from './schemas';

// A roulette result posted to the feeds, built by the backend from its duty
// data. Images are ids for GET /api/images/:id (see gameImageUrl).
export type RouletteCard = Schemas['RouletteCard'];

// A Party Finder listing shared as a post: the listing as it was then.
export type PartyFinderPost = Schemas['PartyFinderPost'];

export type Article = Schemas['Article'];

export type CreateArticle = Schemas['NewArticle'];

// Only the fields being changed.
export type EditArticle = Schemas['ArticleUpdate'];

export type ArticleResponse = Schemas['ArticleResponse'];

// The popular tags, for the home page's tag list.
export type TagsResponse = Schemas['TagsResponse'];
