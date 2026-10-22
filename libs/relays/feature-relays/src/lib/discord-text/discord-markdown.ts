import type { InlineNode, BlockNode } from './discord-markdown.model';

// Discord's Markdown, read into nodes the template renders (never HTML):
// what bots and hunt groups write. Blocks: code blocks (```), quotes (> and
// >>>), headings (#, ##, ###), small text (-#) and lists (- or *); every
// other line is a line. Inline: **bold**, *italic* / _italic_, __underline__,
// ~~strike~~, ||spoiler||, `code`, [text](link), bare links, custom emoji
// (<:name:id>), times (<t:seconds:style>), mentions and a few :emoji:.
// The :shortcodes: bots write that Discord shows as emoji.
const SHORTCODES: Record<string, string> = {
  zzz: '💤',
  star: '⭐',
  sparkles: '✨',
  warning: '⚠️',
  white_check_mark: '✅',
  x: '❌',
  heart: '❤️',
  fire: '🔥',
  tada: '🎉',
  clock: '🕒',
  calendar: '📅',
  coffee: '☕',
  crown: '👑',
  trophy: '🏆',
  dart: '🎯',
  train: '🚆',
  bullettrain_side: '🚄',
  arrow_right: '➡️',
};

// Each inline pattern, tried in order at every position.
const INLINE: { pattern: RegExp; node: (match: RegExpExecArray) => InlineNode | undefined }[] = [
  { pattern: /^\\([^\w\s])/, node: (m) => ({ kind: 'text', text: m[1] }) },
  { pattern: /^`([^`]+)`/, node: (m) => ({ kind: 'code', text: m[1] }) },
  { pattern: /^<a?:(\w+):(\d+)>/, node: (m) => emoji(m[1], m[2]) },
  {
    pattern: /^<t:(-?\d+)(?::([tTdDfFR]))?>/,
    node: (m) => ({ kind: 'time', at: Number(m[1]) * 1000, style: m[2] ?? 'f' }),
  },
  { pattern: /^<@!?\d+>/, node: () => ({ kind: 'text', text: '@someone' }) },
  { pattern: /^<@&\d+>/, node: () => ({ kind: 'text', text: '@role' }) },
  { pattern: /^<#\d+>/, node: () => ({ kind: 'text', text: '#channel' }) },
  { pattern: /^\[([^\]]+)\]\(<?(https?:\/\/[^\s)>]+)>?\)/, node: (m) => link(m[2], inline(m[1])) },
  { pattern: /^<(https?:\/\/[^\s>]+)>/, node: (m) => link(m[1], [{ kind: 'text', text: m[1] }]) },
  { pattern: /^https?:\/\/[^\s<]+[^\s<.,:;"')\]]/, node: (m) => link(m[0], [{ kind: 'text', text: m[0] }]) },
  // ***both***, and italic opening with bold (***ShB** > EW*), before bold.
  {
    pattern: /^\*\*\*([\s\S]+?)\*\*\*(?!\*)/,
    node: (m) => ({ kind: 'em', children: [{ kind: 'strong', children: inline(m[1]) }] }),
  },
  { pattern: /^\*(\*\*[\s\S]+?\*\*[\s\S]*?)\*(?!\*)/, node: (m) => ({ kind: 'em', children: inline(m[1]) }) },
  { pattern: /^\*\*([\s\S]+?)\*\*(?!\*)/, node: (m) => ({ kind: 'strong', children: inline(m[1]) }) },
  { pattern: /^__([\s\S]+?)__(?!_)/, node: (m) => ({ kind: 'u', children: inline(m[1]) }) },
  { pattern: /^\*(?!\s)([\s\S]+?)\*(?!\*)/, node: (m) => ({ kind: 'em', children: inline(m[1]) }) },
  { pattern: /^_([\s\S]+?)_(?![\w_])/, node: (m) => ({ kind: 'em', children: inline(m[1]) }) },
  { pattern: /^~~([\s\S]+?)~~/, node: (m) => ({ kind: 's', children: inline(m[1]) }) },
  { pattern: /^\|\|([\s\S]+?)\|\|/, node: (m) => ({ kind: 'spoiler', children: inline(m[1]) }) },
  {
    pattern: /^:([a-z0-9_+-]+):/,
    node: (m) => (SHORTCODES[m[1]] ? { kind: 'text', text: SHORTCODES[m[1]] } : undefined),
  },
];

// Where plain text may stop for a pattern to start.
const SPECIAL = /[\\`<[*_~|:h]/;

// A custom emoji, as Discord serves it (still, even if animated: moving
// pictures would need a pause button).
function emoji(name: string, id: string): InlineNode {
  return { kind: 'emoji', name, src: `https://cdn.discordapp.com/emojis/${id}.webp?size=48` };
}

function link(href: string, children: InlineNode[]): InlineNode {
  return { kind: 'link', href, children };
}

export function inline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const push = (text: string) => {
    const last = nodes[nodes.length - 1];
    if (last?.kind === 'text') last.text += text;
    else nodes.push({ kind: 'text', text });
  };
  let rest = text;
  while (rest) {
    const node = matchInline(rest);
    if (node) {
      if (node.node.kind === 'text') push(node.node.text);
      else nodes.push(node.node);
      rest = rest.slice(node.length);
      continue;
    }
    // Up to the next character a pattern could start at (at least one).
    const next = rest.slice(1).search(SPECIAL);
    const length = next === -1 ? rest.length : next + 1;
    push(rest.slice(0, length));
    rest = rest.slice(length);
  }
  return nodes;
}

function matchInline(text: string) {
  for (const { pattern, node } of INLINE) {
    const match = pattern.exec(text);
    const result = match && node(match);
    if (match && result) return { node: result, length: match[0].length };
  }
  return undefined;
}

// A message's text as blocks.
export function discordMarkdown(text: string): BlockNode[] {
  const blocks: BlockNode[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = /^```(.*)$/.exec(line);
    if (fence) {
      const first = fence[1];
      if (first.length > 3 && first.endsWith('```')) {
        blocks.push({ kind: 'codeblock', text: first.slice(0, -3) });
        continue;
      }
      // Up to the closing fence (or the end); a lone word after the opening
      // one names the language and isn't shown.
      const body = first && !/^\w+$/.test(first) ? [first] : [];
      while (++i < lines.length && !lines[i].includes('```')) body.push(lines[i]);
      const last = i < lines.length ? lines[i].slice(0, lines[i].indexOf('```')) : '';
      if (last) body.push(last);
      blocks.push({ kind: 'codeblock', text: body.join('\n') });
      continue;
    }
    if (line.startsWith('>>> ')) {
      blocks.push({ kind: 'quote', blocks: discordMarkdown([line.slice(4), ...lines.slice(i + 1)].join('\n')) });
      break;
    }
    if (/^> ?/.test(line)) {
      const quoted = [line.replace(/^> ?/, '')];
      while (i + 1 < lines.length && /^> ?/.test(lines[i + 1])) quoted.push(lines[++i].replace(/^> ?/, ''));
      blocks.push({ kind: 'quote', blocks: discordMarkdown(quoted.join('\n')) });
      continue;
    }
    blocks.push(blockOf(line));
  }
  return blocks;
}

function blockOf(line: string): BlockNode {
  const heading = /^(#{1,3}) (.+)$/.exec(line);
  if (heading) return { kind: 'heading', level: heading[1].length as 1 | 2 | 3, children: inline(heading[2]) };
  const subtext = /^-# (.+)$/.exec(line);
  if (subtext) return { kind: 'subtext', children: inline(subtext[1]) };
  const item = /^\s*[-*] (.+)$/.exec(line);
  if (item) return { kind: 'item', children: inline(item[1]) };
  return { kind: 'line', children: inline(line) };
}
