// Discord's Markdown as nodes the template renders (discord-markdown.ts
// reads them): the inline pieces of a line, and the blocks.
export type InlineNode =
  | { kind: 'text'; text: string }
  | { kind: 'strong' | 'em' | 'u' | 's' | 'spoiler'; children: InlineNode[] }
  | { kind: 'code'; text: string }
  | { kind: 'link'; href: string; children: InlineNode[] }
  | { kind: 'emoji'; name: string; src: string }
  | { kind: 'time'; at: number; style: string };

export type BlockNode =
  | { kind: 'line'; children: InlineNode[] }
  | { kind: 'heading'; level: 1 | 2 | 3; children: InlineNode[] }
  | { kind: 'subtext'; children: InlineNode[] }
  | { kind: 'item'; children: InlineNode[] }
  | { kind: 'codeblock'; text: string }
  | { kind: 'quote'; blocks: BlockNode[] };
