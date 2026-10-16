import { markLostLinks } from './lost-links';

const PAGE = 'https://www.partake.gg/events/56046';
const NOTE = ` *(the link is [on Partake](${PAGE}))*`;

// Lines from this week's descriptions on Partake (October 2026), whose
// links its Markdown dropped.
describe('markLostLinks', () => {
  it.each(['🌐 Website', '🌍 Website', '🌐 Join our Discord', '[Discord]', '[Website]', '## **- ****DISCORD**** - **'])(
    'points "%s" to the Partake page',
    (line) => {
      expect(markLostLinks(`Come by!\n${line}\n\nSee you.`, PAGE)).toBe(`Come by!\n${line}${NOTE}\n\nSee you.`);
    },
  );

  it('leaves links, and a label over the links that follow it', () => {
    const text = [
      '[Website](https://velvetxiv.crd.co/)',
      'Discord: https://discord.gg/abc',
      '**🌿Discord🌿**',
      '',
      'discord.gg/sunsetcoast',
    ].join('\n');

    expect(markLostLinks(text, PAGE)).toBe(text);
  });

  it('leaves sentences that only mention a site', () => {
    const text =
      'For more info, visit our website.\nYou can find our menu on our discord!\nInstagram: starlightgardenxiv';

    expect(markLostLinks(text, PAGE)).toBe(text);
  });

  it('points a label at the very end too', () => {
    expect(markLostLinks('![](https://cdn.partake.gg/a.webp)\n🌐 Website\n\n\n', PAGE)).toBe(
      `![](https://cdn.partake.gg/a.webp)\n🌐 Website${NOTE}\n\n\n`,
    );
  });
});
