import { CREST, PageMeta, SITE_NAME, text } from './page-meta';

// The free company's Discord server and Lodestone page, as the site links
// them (libs/ui/components/src/community-links).
const DISCORD = 'https://discord.gg/FeuTPU8jR5';
const LODESTONE = 'https://na.finalfantasyxiv.com/lodestone/freecompany/9232660711086364990/';

const HOME_DESCRIPTION =
  'Everise is a laid-back, friendly Final Fantasy XIV free company on Odin (Light, EU). ' +
  'Live Party Finder listings for every data centre, a duty roulette, and the Waking Sands chat. Everyone is welcome.';

// Who the site is, for search engines: the free company and its site.
function siteData(siteUrl: string): object[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: siteUrl + '/',
      logo: siteUrl + CREST,
      description: HOME_DESCRIPTION,
      sameAs: [DISCORD, LODESTONE],
    },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: siteUrl + '/' },
  ];
}

// The pages whose words don't come from data, by path. /party-finder and
// its data centres are in party-finder-page.ts, posts in article-page.ts.
export function staticPage(path: string, siteUrl: string): PageMeta | undefined {
  switch (path) {
    case '/':
    case '/home':
      return {
        title: 'Everise · FFXIV free company on Odin (Light)',
        description: HOME_DESCRIPTION,
        path: '/',
        jsonLd: siteData(siteUrl),
        body: shell(
          'Everise',
          HOME_DESCRIPTION,
          [
            ['/party-finder', 'Party Finder: live listings on every data centre'],
            ['/roulette', 'Duty Roulette: let three reels pick your next run'],
            ['/waking-sands', 'The Waking Sands: talk with members and the Scions'],
          ],
          [
            [DISCORD, 'Join us on Discord'],
            [LODESTONE, 'Everise on the Lodestone'],
          ],
        ),
      };
    case '/roulette':
      return {
        title: 'FFXIV Duty Roulette · pick your next run · Everise',
        description:
          "Can't decide what to run in Final Fantasy XIV? Three reels pick the kind of duty, the duty and how you run it, " +
          'from dungeons and trials to raids, with job and party settings. Free, no account needed.',
        path: '/roulette',
      };
    case '/waking-sands':
      return {
        title: 'The Waking Sands · chat with the Scions · Everise',
        description:
          "Drop by the Scions' rooms in Vesper Bay and talk with Tataru, Y'shtola, Urianger and friends, " +
          "alongside Everise's members. A Final Fantasy XIV fan chat.",
        path: '/waking-sands',
      };
    case '/privacy':
      return {
        title: 'Privacy policy · Everise',
        description: 'What Everise keeps about you, why, and how to have it deleted.',
        path: '/privacy',
      };
    case '/login':
      return { title: 'Sign in · Everise', description: 'Sign in to Everise.', path: '/login', noindex: true };
    case '/register':
      return {
        title: 'Sign up · Everise',
        description: 'Join Everise: post in the feed, share roulette results and talk in the Waking Sands.',
        path: '/register',
        noindex: true,
      };
    default:
      return undefined;
  }
}

// A page's words as plain HTML, for crawlers that don't run the app.
export function shell(heading: string, intro: string, links: [string, string][], external: [string, string][] = []) {
  const items = [
    ...links.map(([href, label]) => `<li><a href="${href}">${text(label)}</a></li>`),
    ...external.map(([href, label]) => `<li><a href="${href}" rel="noopener">${text(label)}</a></li>`),
  ];
  return `<h1>${text(heading)}</h1><p>${text(intro)}</p><ul>${items.join('')}</ul>`;
}
