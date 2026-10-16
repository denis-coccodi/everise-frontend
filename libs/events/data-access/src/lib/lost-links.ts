// What a line that was a link says, once Partake's Markdown has dropped
// the address: "🌐 Website", "[Discord]", "**🌿Carrd🌿**".
const LINK_LABEL =
  /^(?:web ?site|site|discord|discord server|join (?:our|the|us on) discord|carrd|linktree|twitter|x|bluesky|twitch|instagram|tiktok|youtube|links?)$/i;
// Something on a line that is, or names, an address.
const ADDRESS = /https?:\/\/|\]\(|\bdiscord\.gg\/|\b[\w-]+\.(?:com|gg|co|tv|ee|me|io|net|org)\b/i;

// A line's words, without Markdown marks, brackets, emoji or punctuation.
function words(line: string) {
  return line
    .replace(/^\s{0,3}#{1,6}\s+/, '')
    .replace(/[*_~`[\]()]/g, '')
    .replace(/[^\p{L}\p{N}\s.]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Partake's API gives an event's description as Markdown, and drops the
// address of a link written in a heading: "🌐 Website" is left, linking
// nowhere, while the event's Partake page still has the link. Each such
// line (only a link's label, with no address on it or on the next line, as
// a heading over a list of links has) gets a note pointing there.
export function markLostLinks(markdown: string, partakeUrl: string) {
  const lines = markdown.split('\n');
  return lines
    .map((line, i) => {
      if (ADDRESS.test(line) || !LINK_LABEL.test(words(line))) return line;
      const next = lines.slice(i + 1).find((later) => later.trim());
      if (next && ADDRESS.test(next)) return line;
      return `${line.trimEnd()} *(the link is [on Partake](${partakeUrl}))*`;
    })
    .join('\n');
}
