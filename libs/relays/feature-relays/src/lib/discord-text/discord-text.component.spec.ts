import { TestBed } from '@angular/core/testing';
import { DiscordTextComponent } from './discord-text.component';

describe('DiscordTextComponent', () => {
  async function render(text: string, inline = false) {
    const fixture = TestBed.createComponent(DiscordTextComponent);
    fixture.componentRef.setInput('text', text);
    fixture.componentRef.setInput('inline', inline);
    fixture.componentRef.setInput('now', Date.parse('2026-10-14T12:00:00Z'));
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows Discord Markdown as text, emoji and times, a paragraph a line', async () => {
    const page = await render('**[Odin]** at <:aetheryte:866773648450519082>\nstarts <t:1791979560:R>');

    const lines = page.querySelectorAll('p');
    expect(lines).toHaveLength(2);
    expect(lines[0].querySelector('strong')?.textContent).toBe('[Odin]');
    const emoji = lines[0].querySelector('img.emoji') as HTMLImageElement;
    expect(emoji.alt).toBe(':aetheryte:');
    expect(emoji.src).toContain('/emojis/866773648450519082.webp');
    const time = lines[1].querySelector('time');
    expect(time?.getAttribute('datetime')).toBe('2026-10-14T12:06:00.000Z');
    expect(time?.textContent).toMatch(/6 minutes/);
  });

  it('opens links in a new tab, and never renders HTML it was sent', async () => {
    const page = await render('[map](https://example.com/m) <b>bold</b>');

    const link = page.querySelector('a') as HTMLAnchorElement;
    expect(link.href).toBe('https://example.com/m');
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
    expect(page.querySelector('b')).toBeNull();
    expect(page.textContent).toContain('<b>bold</b>');
  });

  it('reads one line without blocks when inline', async () => {
    const page = await render('Season 217 **Recommendations**', true);

    expect(page.querySelector('p')).toBeNull();
    expect(page.querySelector('strong')?.textContent).toBe('Recommendations');
  });
});
