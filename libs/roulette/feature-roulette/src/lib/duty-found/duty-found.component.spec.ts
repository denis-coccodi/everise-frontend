import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiscordSharingService } from '@everise/articles/data-access';
import { Commence, DutyFoundComponent, RouletteResult } from './duty-found.component';

const result: RouletteResult = {
  type: 'Raids — Savage',
  name: 'Alexander - The Burden of the Father (Savage)',
  detail: 'Lv. 60 · i205 · Heavensward',
  mode: 'Awktrail',
  dutyUnknown: false,
  wiki: 'https://ffxiv.consolegameswiki.com/mediawiki/index.php?title=Special:Search&go=Go&search=x',
};

describe('DutyFoundComponent', () => {
  let fixture: ComponentFixture<DutyFoundComponent>;

  // Whether the backend can share in the Everise Discord.
  const discordAvailable = signal(true);

  async function show(shown: RouletteResult, signedIn = false) {
    await TestBed.configureTestingModule({
      imports: [DutyFoundComponent],
      providers: [{ provide: DiscordSharingService, useValue: { available: discordAvailable } }],
    }).compileComponents();
    fixture = TestBed.createComponent(DutyFoundComponent);
    fixture.componentRef.setInput('result', shown);
    fixture.componentRef.setInput('signedIn', signedIn);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const commenceButton = (page: HTMLElement) =>
    [...page.querySelectorAll('button')].find((b) => b.textContent?.includes('Commence')) as HTMLButtonElement;

  it('lets a signed-in user add a comment, which Commence sends', async () => {
    const page = await show(result, true);
    const sent: Commence[] = [];
    fixture.componentInstance.commence.subscribe((choice) => sent.push(choice));

    const textarea = page.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = '  Wish me luck!  ';
    textarea.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(page.querySelector('.count')?.textContent?.trim()).toBe('17 / 280');

    commenceButton(page).click();
    expect(sent).toEqual([{ comment: 'Wish me luck!' }]);
    expect(page.querySelector('.note')).toBeNull();
  });

  it('tells a guest Tataru will post for them, with no comment box', async () => {
    const page = await show(result);
    const sent: Commence[] = [];
    fixture.componentInstance.commence.subscribe((choice) => sent.push(choice));

    expect(page.querySelector('textarea')).toBeNull();
    // Tataru only posts on the site.
    expect(page.querySelector('cdt-checkbox')).toBeNull();
    expect(page.querySelector('.note')?.textContent).toContain('Tataru will post this to the feed for you');
    commenceButton(page).click();
    expect(sent).toEqual([{}]);
  });

  it('shares in the Everise Discord only when the member ticks it', async () => {
    discordAvailable.set(true);
    const page = await show(result, true);
    const sent: Commence[] = [];
    fixture.componentInstance.commence.subscribe((choice) => sent.push(choice));

    const box = page.querySelector('cdt-checkbox input') as HTMLInputElement;
    expect(page.querySelector('cdt-checkbox')?.textContent?.trim()).toBe('Also share in the Everise Discord');
    expect(box.checked).toBe(false);
    commenceButton(page).click();
    box.click();
    await fixture.whenStable();
    commenceButton(page).click();

    expect(sent).toEqual([{}, { shareToDiscord: true }]);
  });

  it("doesn't offer Discord where the site can't share there", async () => {
    discordAvailable.set(false);
    const page = await show(result, true);

    expect(page.querySelector('cdt-checkbox')).toBeNull();
    discordAvailable.set(true);
  });

  it('shows the posting state and why posting failed', async () => {
    const page = await show(result, true);
    fixture.componentRef.setInput('posting', true);
    await fixture.whenStable();
    expect(commenceButton(page)).toBeUndefined();
    expect(page.textContent).toContain('Posting…');

    fixture.componentRef.setInput('posting', false);
    fixture.componentRef.setInput('postError', 'You can post another result in 15 seconds.');
    await fixture.whenStable();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('15 seconds');
  });

  it('links the guide for the party setting, opening in a new tab', async () => {
    const page = await show({ ...result, guide: { label: 'Awktrail gear set', url: 'https://example.com/sheet' } });

    const link = page.querySelector<HTMLAnchorElement>('.guide a');
    expect(link?.textContent?.trim()).toBe('Awktrail gear set');
    expect(link?.getAttribute('href')).toBe('https://example.com/sheet');
    expect(link?.target).toBe('_blank');
    expect(link?.rel).toContain('noopener');
  });

  it('puts the focus on Commence', async () => {
    const page = await show(result);

    expect(document.activeElement?.textContent?.trim()).toBe('Commence');
    expect(page.contains(document.activeElement)).toBe(true);
  });

  it("links the duty's wiki page, opening in a new tab", async () => {
    const page = await show(result);

    const link = page.querySelector<HTMLAnchorElement>('.wiki a');
    expect(link?.textContent).toContain('Wiki guide');
    expect(link?.getAttribute('href')).toBe(result.wiki);
    expect(link?.target).toBe('_blank');
    expect(link?.rel).toContain('noopener');
  });

  it('shows no guide link without one', async () => {
    const page = await show({ ...result, mode: 'Regular' });

    expect(page.querySelector('.guide')).toBeNull();
  });
});
