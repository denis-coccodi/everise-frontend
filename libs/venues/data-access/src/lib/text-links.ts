// A piece of an owner's text: words, or a web address to link.
export interface TextPart {
  text: string;
  url?: string;
}

// Web addresses in text, up to a space or a bracket.
const ADDRESS = /https?:\/\/[^\s<>()[\]{}"']+/g;

// The owners' text cut into words and web addresses, so the page can link
// the addresses without reading the text as HTML. Punctuation ending a
// sentence after an address ("…/abc.") stays text.
export function textParts(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(ADDRESS)) {
    const url = match[0].replace(/[.,;:!?]+$/, '');
    const start = match.index ?? 0;
    if (start > last) parts.push({ text: text.slice(last, start) });
    parts.push({ text: url, url });
    last = start + url.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
