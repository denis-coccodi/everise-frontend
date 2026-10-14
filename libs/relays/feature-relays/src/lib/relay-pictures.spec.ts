import { RelayMessage } from '@everise/core/api-types';
import { embedColour, messagePictures, pictureUrl } from './relay-pictures';

describe('relay pictures', () => {
  it('serves our copy when there is one, else the link as it was', () => {
    expect(pictureUrl('/api', { url: 'https://cdn.discordapp.com/x.png', file: '12.png' })).toBe(
      '/api/relays/images/12.png',
    );
    expect(pictureUrl('/api', { url: 'https://media.tenor.com/a.gif' })).toBe('https://media.tenor.com/a.gif');
  });

  it("puts a message's GIFs, picture embeds and attached images in the grid, not its cards", () => {
    const message: RelayMessage = {
      id: '1',
      postedAt: '2026-10-14T12:00:00.000Z',
      sourceName: 'Centurio Hunts',
      content: '',
      embeds: [
        { type: 'gifv', title: 'Train GIF', fields: [], thumbnail: { url: 'https://media.tenor.com/t.gif' } },
        { type: 'image', fields: [], thumbnail: { url: 'https://cdn.discordapp.com/m.webp', file: '5.webp' } },
        { type: 'rich', title: 'A card', fields: [] },
      ],
      attachments: [
        { url: 'https://cdn.discordapp.com/a.png', file: '6.png', name: 'a.png', contentType: 'image/png' },
      ],
    };

    expect(messagePictures('/api', message)).toEqual([
      { kind: 'gif', url: 'https://media.tenor.com/t.gif', alt: 'Train GIF', width: undefined, height: undefined },
      { kind: 'image', url: '/api/relays/images/5.webp', alt: 'Picture', width: undefined, height: undefined },
      { kind: 'image', url: '/api/relays/images/6.png', alt: 'a.png', width: undefined, height: undefined },
    ]);
  });

  it("gives a card's edge colour as hex", () => {
    expect(embedColour({ type: 'rich', fields: [], color: 2067276 })).toBe(
      '#' + (2067276).toString(16).padStart(6, '0'),
    );
    expect(embedColour({ type: 'rich', fields: [] })).toBeNull();
  });
});
