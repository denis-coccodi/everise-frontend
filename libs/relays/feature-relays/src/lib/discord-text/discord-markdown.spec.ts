import { discordMarkdown, inline } from './discord-markdown';

describe('discordMarkdown', () => {
  it('reads a hunt train announcement: bold, emoji, a time, a masked link', () => {
    const [line] = discordMarkdown(
      '@EWTrain **[Odin]** starting <t:1791985714:R> at <:aetheryte:866773648450519082> [ThunderTrain](https://tenor.com/view/x)',
    );

    expect(line).toEqual({
      kind: 'line',
      children: [
        { kind: 'text', text: '@EWTrain ' },
        { kind: 'strong', children: [{ kind: 'text', text: '[Odin]' }] },
        { kind: 'text', text: ' starting ' },
        { kind: 'time', at: 1791985714000, style: 'R' },
        { kind: 'text', text: ' at ' },
        { kind: 'emoji', name: 'aetheryte', src: 'https://cdn.discordapp.com/emojis/866773648450519082.webp?size=48' },
        { kind: 'text', text: ' ' },
        { kind: 'link', href: 'https://tenor.com/view/x', children: [{ kind: 'text', text: 'ThunderTrain' }] },
      ],
    });
  });

  it('nests marks, and keeps one line per line', () => {
    const blocks = discordMarkdown('***ShB** > EW*\n~~gone~~ __under__ ||secret|| `code`');

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({
      kind: 'line',
      children: [
        {
          kind: 'em',
          children: [
            { kind: 'strong', children: [{ kind: 'text', text: 'ShB' }] },
            { kind: 'text', text: ' > EW' },
          ],
        },
      ],
    });
    const second = blocks[1];
    expect(second.kind === 'line' && second.children.map((node) => node.kind)).toEqual([
      's',
      'text',
      'u',
      'text',
      'spoiler',
      'text',
      'code',
    ]);
  });

  it('reads ***both*** as bold italic', () => {
    expect(inline('***Fort Jobb - Lakeland***')).toEqual([
      { kind: 'em', children: [{ kind: 'strong', children: [{ kind: 'text', text: 'Fort Jobb - Lakeland' }] }] },
    ]);
  });

  it('reads blocks: headings, small text, list items, quotes and code', () => {
    const blocks = discordMarkdown('# Big\n-# small\n- item\n> quoted\n```js\nlet a;\n```');

    expect(blocks.map((block) => block.kind)).toEqual(['heading', 'subtext', 'item', 'quote', 'codeblock']);
    expect(blocks[4]).toEqual({ kind: 'codeblock', text: 'let a;' });
  });

  it("shows bots' shortcodes as emoji, and leaves unknown ones as written", () => {
    expect(inline(':zzz: Rest :nope:')).toEqual([{ kind: 'text', text: '💤 Rest :nope:' }]);
  });

  it('links bare addresses, never other schemes', () => {
    expect(inline('see https://example.com/a.')).toEqual([
      { kind: 'text', text: 'see ' },
      { kind: 'link', href: 'https://example.com/a', children: [{ kind: 'text', text: 'https://example.com/a' }] },
      { kind: 'text', text: '.' },
    ]);
    expect(inline('[x](javascript:alert(1))')).toEqual([{ kind: 'text', text: '[x](javascript:alert(1))' }]);
  });
});
