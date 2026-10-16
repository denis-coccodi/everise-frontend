import { matchesSearch } from './text-search';

describe('matchesSearch', () => {
  const club = ['RAZE Nightclub', 'Shiva', 'Goblet, Ward 20, Plot 38', 'Live DJs', 'Café'];

  it('matches every word typed, anywhere, in any order and case', () => {
    expect(matchesSearch('goblet dj', club)).toBe(true);
    expect(matchesSearch('  SHIVA   raze ', club)).toBe(true);
    expect(matchesSearch('goblet mist', club)).toBe(false);
  });

  it('ignores accents, both ways', () => {
    expect(matchesSearch('cafe', club)).toBe(true);
    expect(matchesSearch('Nîghtclub', club)).toBe(true);
  });

  it('matches everything when nothing is typed, and skips missing texts', () => {
    expect(matchesSearch('', club)).toBe(true);
    expect(matchesSearch('   ', [])).toBe(true);
    expect(matchesSearch('shiva', [null, undefined, 'Shiva'])).toBe(true);
  });
});
