// Text as a search compares it: lower case, without accents ("Café" and
// "cafe" are the same).
function folded(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

// Whether every word typed in a list's search box is in one of the texts,
// in any order: "goblet dj" finds a club on the Goblet with Live DJs. An
// empty search matches everything.
export function matchesSearch(search: string, texts: (string | null | undefined)[]) {
  const words = folded(search).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = folded(texts.filter(Boolean).join(' \n '));
  return words.every((word) => haystack.includes(word));
}
