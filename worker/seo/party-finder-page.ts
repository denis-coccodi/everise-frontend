import { PageMeta, SITE_NAME, text } from './page-meta';

// The parts of GET /api/party-finder the page's words use.
export interface Board {
  dataCentre: string;
  worlds: { name: string }[];
  regions: { name: string; dataCentres: string[] }[];
  listings: { duty: string | null; category: string; expiresAt: string }[];
}

// xivpf's categories, as the page names them (libs/party-finder/data-access).
const CATEGORY_NAMES: Record<string, string> = {
  DutyRoulette: 'Duty Roulette',
  Dungeon: 'Dungeons',
  Guildhest: 'Guildhests',
  Trial: 'Trials',
  Raid: 'Raids',
  HighEndDuty: 'High-end Duty',
  PvP: 'PvP',
  GoldSaucer: 'Gold Saucer',
  Fate: 'FATEs',
  TreasureHunt: 'Treasure Hunt',
  TheHunt: 'The Hunt',
  GatheringForay: 'Gathering Forays',
  DeepDungeon: 'Deep Dungeons',
  FieldOperation: 'Field Operations',
  VariantAndCriterionDungeon: 'V&C Dungeons',
};

// The duties listed by name in the page's words, the most recruited first.
const TOP_DUTIES = 12;

// "/party-finder/light" → "Light"; undefined for anything else.
export function dataCentreIn(path: string): string | undefined {
  const name = /^\/party-finder\/([a-z]+)\/?$/.exec(path)?.[1];
  return name && name[0].toUpperCase() + name.slice(1);
}

// The Party Finder page for everyone (`dataCentre` undefined) or for one
// data centre. With the board, the words say what's up right now; without
// it (xivpf unreachable, an unknown name), they still say what the page is.
export function partyFinderPage(
  dataCentre: string | undefined,
  board: Board | undefined,
  siteUrl: string,
  now: number,
): PageMeta {
  const live = (board?.listings ?? []).filter((listing) => Date.parse(listing.expiresAt) > now);
  const regions = board?.regions ?? [];
  const allDataCentres = regions.flatMap((region) => region.dataCentres);

  if (!dataCentre) {
    const description =
      'Final Fantasy XIV Party Finder listings from every data centre, live in your browser without logging in to the game: ' +
      `${
        allDataCentres.length
          ? allDataCentres.join(', ')
          : 'Light, Chaos, Aether, Crystal, Primal, Dynamis, Elemental, Gaia, Mana, Meteor and Materia'
      }. ` +
      'Refreshed every minute, sorted like the game, with jobs, roles and filters.';
    return {
      title: 'FFXIV Party Finder online · every data centre, live · ' + SITE_NAME,
      description,
      path: '/party-finder',
      jsonLd: [breadcrumbs([['Party Finder', '/party-finder']], siteUrl)],
      // The board is only read for the regions: its listings are one data
      // centre's, not everyone's.
      body: body('FFXIV Party Finder, live', description, [], regions),
    };
  }

  const region = regions.find((r) => r.dataCentres.includes(dataCentre))?.name;
  const worlds = board?.dataCentre === dataCentre ? board.worlds.map((world) => world.name) : [];
  const where = `the ${dataCentre} data centre${region ? ` (${region})` : ''}`;
  const description =
    `Live Final Fantasy XIV Party Finder listings on ${where}` +
    (worlds.length ? `: ${worlds.join(', ')}` : '') +
    `. ${live.length ? `${live.length} ${live.length === 1 ? 'party' : 'parties'} recruiting right now. ` : ''}` +
    'Refreshed every minute, with jobs, roles and filters.';
  return {
    title: `${dataCentre} Party Finder · live FFXIV listings · ${SITE_NAME}`,
    description,
    path: `/party-finder/${dataCentre.toLowerCase()}`,
    jsonLd: [
      breadcrumbs(
        [
          ['Party Finder', '/party-finder'],
          [dataCentre, `/party-finder/${dataCentre.toLowerCase()}`],
        ],
        siteUrl,
      ),
    ],
    body: body(`${dataCentre} Party Finder`, description, live, regions),
  };
}

function body(heading: string, intro: string, live: Board['listings'], regions: Board['regions']) {
  const parts = [`<h1>${text(heading)}</h1>`, `<p>${text(intro)}</p>`];
  if (live.length) {
    parts.push('<h2>Recruiting now</h2>', `<ul>${recruiting(live)}</ul>`);
  }
  if (regions.length) {
    parts.push('<h2>Every data centre</h2>');
    for (const region of regions) {
      const links = region.dataCentres.map(
        (name) => `<li><a href="/party-finder/${name.toLowerCase()}">${text(name)} Party Finder</a></li>`,
      );
      parts.push(`<h3>${text(region.name)}</h3><ul>${links.join('')}</ul>`);
    }
  }
  parts.push(
    '<p>Listings from <a href="https://xivpf.com/listings" rel="noopener">xivpf.com</a>, ' +
      "collected from players' Remote Party Finder plugin.</p>",
  );
  return parts.join('');
}

// The duties being recruited for, the most listed first, then the
// categories of the rest: counts only, never who's recruiting.
function recruiting(live: Board['listings']) {
  const duties = new Map<string, { category: string; count: number }>();
  for (const listing of live) {
    if (!listing.duty) continue;
    const entry = duties.get(listing.duty) ?? { category: listing.category, count: 0 };
    entry.count++;
    duties.set(listing.duty, entry);
  }
  return [...duties]
    .sort(([a, x], [b, y]) => y.count - x.count || a.localeCompare(b))
    .slice(0, TOP_DUTIES)
    .map(([duty, { category, count }]) => {
      const kind = CATEGORY_NAMES[category];
      return `<li>${text(duty)}${kind ? ` (${text(kind)})` : ''}: ${count} ${count === 1 ? 'party' : 'parties'}</li>`;
    })
    .join('');
}

function breadcrumbs(items: [string, string][], siteUrl: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      item: siteUrl + path,
    })),
  };
}
