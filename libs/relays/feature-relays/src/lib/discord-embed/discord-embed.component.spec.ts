import { TestBed } from '@angular/core/testing';
import { RelayEmbed } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { DiscordEmbedComponent } from './discord-embed.component';

describe('DiscordEmbedComponent', () => {
  async function render(embed: RelayEmbed) {
    TestBed.configureTestingModule({ providers: [{ provide: API_URL, useValue: '/api' }] });
    const fixture = TestBed.createComponent(DiscordEmbedComponent);
    fixture.componentRef.setInput('embed', embed);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it("shows a bot's card: its title as a link, its fields, its edge in the bot's colour", async () => {
    const page = await render({
      type: 'rich',
      title: 'Season 217 (Oct 13 - 19) Recommendations',
      url: 'https://example.com/season',
      color: 2067276,
      fields: [
        { name: 'Cycle 1', value: ':zzz: Always Rest :zzz:', inline: false },
        { name: '', value: '', inline: false },
        { name: '.', value: '**4th Workshop**', inline: true },
      ],
      footer: 'Overseas Casuals',
    });

    expect(page.querySelector('.title a')?.textContent?.trim()).toBe('Season 217 (Oct 13 - 19) Recommendations');
    const names = [...page.querySelectorAll('dt')].map((dt) => dt.textContent?.trim());
    // The empty field breaks the row; "." names aren't shown.
    expect(names).toEqual(['Cycle 1', '']);
    expect(page.querySelectorAll('.break')).toHaveLength(1);
    expect(page.querySelector('dd')?.textContent).toContain('💤 Always Rest 💤');
    expect((page as HTMLElement).style.getPropertyValue('--embed-edge')).toBe(
      '#' + (2067276).toString(16).padStart(6, '0'),
    );
    expect(page.querySelector('.footer')?.textContent).toContain('Overseas Casuals');
  });

  it('shows its large picture from our copy, in the media grid', async () => {
    const page = await render({
      type: 'rich',
      title: 'Fashion Report Week 454',
      fields: [],
      image: { url: 'https://cdn.discordapp.com/attachments/1/2/hint.png', file: '2.png', width: 1701, height: 957 },
      thumbnail: { url: 'https://i.imgur.com/icon.png' },
    });

    expect(page.querySelector('cdt-media-grid img')?.getAttribute('src')).toBe('/api/relays/images/2.png');
    expect(page.querySelector('.thumbnail')?.getAttribute('src')).toBe('https://i.imgur.com/icon.png');
  });
});
