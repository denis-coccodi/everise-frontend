import { PageMeta, SITE_NAME, text } from './page-meta';

// A post as GET /api/articles/:id returns it (the parts the page uses).
export interface Article {
  id: string;
  title: string;
  description: string;
  body: string;
  createdAt?: string;
  updatedAt?: string;
  author: { username: string };
  roulette?: { type: string; name: string; detail: string; image: number | null };
  // Images, GIFs and YouTube videos (older backends: absent).
  media?: { kind: 'image' | 'gif' | 'video'; url: string; videoId?: string }[];
}

// A post's page: its card in Discord and other link previews (which never
// wait for the app to fill them in), and its words for search engines.
export function articlePage(article: Article, siteUrl: string): PageMeta {
  const roulette = article.roulette;
  const description = roulette
    ? `${roulette.type}: ${roulette.name}${roulette.detail ? ` · ${roulette.detail}` : ''}. ${article.description}`
    : article.description;
  // The roulette's duty banner, else the post's first image, else its first
  // YouTube video's thumbnail, else the crest.
  const media = article.media ?? [];
  const firstImage = media.find((item) => item.kind !== 'video')?.url;
  const video = media.find((item) => item.kind === 'video' && item.videoId);
  const thumbnail = video ? `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg` : undefined;
  const picture = roulette?.image ? `${siteUrl}/api/images/${roulette.image}` : firstImage ?? thumbnail;
  // Always the id, even when an old link was followed.
  const path = `/article/${encodeURIComponent(article.id)}`;
  const author = article.author.username;
  return {
    title: `${article.title} · ${SITE_NAME}`,
    description,
    path,
    type: 'article',
    image: picture,
    previewTitle: article.title,
    properties: [['article:author', author]],
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description,
        url: siteUrl + path,
        ...(picture ? { image: [picture] } : {}),
        ...(article.createdAt ? { datePublished: article.createdAt } : {}),
        ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
        author: { '@type': 'Person', name: author, url: `${siteUrl}/profile/${encodeURIComponent(author)}` },
        publisher: { '@type': 'Organization', name: SITE_NAME },
      },
    ],
    body: `<h1>${text(article.title)}</h1><p>By ${text(author)}</p><p>${text(description)}</p>`,
  };
}
