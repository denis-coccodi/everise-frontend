import { PageMeta, SITE_NAME, text } from './page-meta';

// The parts of GET /api/party-finder/listings/:id the page's words use.
export interface ListingFound {
  dataCentre: string;
  listing: {
    duty: string | null;
    world: { name: string };
    minItemLevel: number;
    slots: { job: string | null }[];
  };
}

// "/party-finder/listings/light-1789630212-1" → "light-1789630212-1";
// undefined for anything else.
export function listingIdIn(path: string): string | undefined {
  return /^\/party-finder\/listings\/([a-z]+-\d+-\d+)\/?$/.exec(path)?.[1];
}

// One listing's page, for link previews (the Everise Discord shares these).
// Listings last an hour at most, so search engines are asked to leave them
// out. Like the Party Finder pages, the words say what and where, never
// who. Without the listing (gone, or the backend slow), they still say
// what the page is.
export function listingPage(id: string, found: ListingFound | undefined): PageMeta {
  const path = `/party-finder/listings/${id}`;
  if (!found) {
    const description = 'A Final Fantasy XIV Party Finder listing: open it to see whether it is still up.';
    return {
      title: `Party Finder listing · ${SITE_NAME}`,
      description,
      path,
      noindex: true,
      body: `<h1>Party Finder listing</h1><p>${text(description)}</p>`,
    };
  }
  const { dataCentre, listing } = found;
  const what = listing.duty ?? 'Party Finder listing';
  const needed = listing.slots.filter((slot) => !slot.job).length;
  const description =
    `On the ${dataCentre} Party Finder, from ${listing.world.name}: ` +
    `${needed} ${needed === 1 ? 'player' : 'players'} needed` +
    (listing.minItemLevel > 0 ? `, item level ${listing.minItemLevel}` : '') +
    '.';
  return {
    title: `${what} · ${dataCentre} Party Finder · ${SITE_NAME}`,
    previewTitle: `${what} · ${dataCentre} Party Finder`,
    description,
    path,
    noindex: true,
    body: `<h1>${text(what)}</h1><p>${text(description)}</p>`,
  };
}
