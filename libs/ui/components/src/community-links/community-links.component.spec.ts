import { TestBed } from '@angular/core/testing';
import { CommunityLinksComponent, EVERISE_DISCORD, EVERISE_LODESTONE } from './community-links.component';

describe('CommunityLinksComponent', () => {
  async function render(look?: 'buttons' | 'links') {
    const fixture = TestBed.createComponent(CommunityLinksComponent);
    if (look) fixture.componentRef.setInput('look', look);
    await fixture.whenStable();
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll('a')];
  }

  it('links to the Discord server and the Lodestone page in a new tab, saying so', async () => {
    const links = await render();

    expect(links.map((a) => a.getAttribute('href'))).toEqual([EVERISE_DISCORD, EVERISE_LODESTONE]);
    expect(links.map((a) => a.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Join us on Discord (opens in a new tab)',
      'EVERise on the Lodestone (opens in a new tab)',
    ]);
    for (const a of links) {
      expect(a.target).toBe('_blank');
      expect(a.rel).toBe('noopener noreferrer');
      expect(a.querySelector('img')?.getAttribute('alt')).toBe('');
    }
  });

  it('shows them as buttons when asked', async () => {
    const links = await render('buttons');

    expect(links.every((a) => a.getAttribute('data-variant') === 'outline-secondary')).toBe(true);
  });
});
