import type { DataCentre, PartyFinderBoard } from '@everise/core/api-types';
import { worldId } from './listing-filters';

// The regions, for the pickers: each region's data centres share one Party
// Finder in the game (a physical data centre; since patch 7.58 in Europe
// and North America). Each with the data centre it goes to (the one shown,
// if it's there), whether it's the one shown, and its name with how many
// listings are up ("Europe (138)"). The one shown, once its board is in,
// counts its own list (`current.listings`), so the two agree.
export function regionChoices(
  regions: PartyFinderBoard['regions'],
  counts: PartyFinderBoard['counts'],
  dataCentre: DataCentre,
  current: { shown: boolean; listings: number },
) {
  const byName = new Map(counts.map((c) => [c.dataCentre as string, c.listings]));
  return regions.map((region) => {
    const here = region.dataCentres.includes(dataCentre);
    const known = region.dataCentres.every((name) => byName.has(name));
    const own = here && current.shown;
    const count = own ? current.listings : region.dataCentres.reduce((n, d) => n + (byName.get(d) ?? 0), 0);
    const name = region.name || region.dataCentres.join(', ');
    return {
      value: here ? dataCentre : region.dataCentres[0],
      current: here,
      label: known || own ? `${name} (${count})` : name,
    };
  });
}

// A board's worlds by data centre, for the world picker's groups: a region
// has several (Light and Chaos); none when it has just one (Materia).
export function worldGroups(worlds: PartyFinderBoard['worlds']) {
  const names = [...new Set(worlds.map((world) => world.dataCentre))];
  if (names.length < 2) return [];
  return names.map((name) => ({
    name,
    worlds: worlds.filter((w) => w.dataCentre === name).map((w) => ({ id: worldId(w), name: w.name })),
  }));
}

// Names in words: "Light", "Light and Chaos", "Aether, Crystal, Dynamis and Primal".
export function inWords(names: string[]) {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}
