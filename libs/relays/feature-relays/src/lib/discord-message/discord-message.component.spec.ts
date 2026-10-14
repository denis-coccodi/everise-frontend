import { TestBed } from '@angular/core/testing';
import { RelayMessage } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { DiscordMessageComponent } from './discord-message.component';

const TRAIN: RelayMessage = {
  id: '1559909823334846464',
  postedAt: '2026-10-14T12:44:43.606Z',
  sourceName: 'Centurio Hunts (FFXIV) #light-train-relay',
  content: '@EWTrain **[Shiva]** Hunt train starting <t:1791982446:R>',
  embeds: [
    { type: 'gifv', title: 'Train GIF', fields: [], thumbnail: { url: 'https://media1.tenor.com/m/x/train.gif' } },
    { type: 'rich', title: 'A card', fields: [] },
  ],
  attachments: [],
};

describe('DiscordMessageComponent', () => {
  async function render(message: RelayMessage, showSource = true) {
    TestBed.configureTestingModule({ providers: [{ provide: API_URL, useValue: '/api' }] });
    const fixture = TestBed.createComponent(DiscordMessageComponent);
    fixture.componentRef.setInput('message', message);
    fixture.componentRef.setInput('showSource', showSource);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows where it came from and when, its text, its cards, and its GIFs in the media grid', async () => {
    const page = await render(TRAIN);

    expect(page.querySelector('.source .name')?.textContent).toBe('Centurio Hunts (FFXIV) #light-train-relay');
    expect(page.querySelector('.source time')?.getAttribute('datetime')).toBe(TRAIN.postedAt);
    expect(page.querySelector('cdt-discord-text strong')?.textContent).toBe('[Shiva]');
    // The GIF embed is a picture, not a card.
    expect(page.querySelectorAll('cdt-discord-embed')).toHaveLength(1);
    expect(page.querySelector('cdt-media-grid cdt-gif img')?.getAttribute('src')).toBe(
      'https://media1.tenor.com/m/x/train.gif',
    );
  });

  it('leaves the source out when asked (the Weekly tab names its posts)', async () => {
    const page = await render(TRAIN, false);
    expect(page.querySelector('.source')).toBeNull();
  });
});
