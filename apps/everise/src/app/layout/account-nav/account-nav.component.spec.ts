import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountNavComponent } from './account-nav.component';

describe('AccountNavComponent', () => {
  async function render(variant: 'menu' | 'list') {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AccountNavComponent);
    fixture.componentRef.setInput('user', {
      id: 'u1',
      email: '',
      username: 'avar',
      displayName: 'Avar Kriss (Odin)',
      bio: '',
      image: '',
    });
    fixture.componentRef.setInput('variant', variant);
    let signedOut = false;
    fixture.componentInstance.logout.subscribe(() => (signedOut = true));
    await fixture.whenStable();
    return { fixture, host: fixture.nativeElement as HTMLElement, signedOut: () => signedOut };
  }

  it("is the Account menu, named by the member's name", async () => {
    const { host, signedOut } = await render('menu');

    const trigger = host.querySelector('button[aria-haspopup=menu]') as HTMLButtonElement;
    // The name stays in the button for screen readers, also where only the picture shows.
    expect(trigger.querySelector('.name')?.textContent).toBe('Avar Kriss (Odin)');
    expect(host.querySelector('[role=menu]')?.getAttribute('aria-label')).toBe('Account');
    const items = [...host.querySelectorAll('[role=menuitem]')] as HTMLElement[];
    expect(items.map((item) => item.textContent?.trim())).toEqual(['Your profile', 'Settings', 'Sign out']);
    expect(items[0].getAttribute('href')).toBe('/profile/u1');

    items[2].click();
    expect(signedOut()).toBe(true);
  });

  it('folds the links under the name in the phone panel, and folds them again when asked', async () => {
    const { fixture, host } = await render('list');
    const heading = host.querySelector('button.account-heading') as HTMLButtonElement;
    const links = host.querySelector('#account-links') as HTMLElement;
    expect(heading.textContent?.trim()).toBe('Avar Kriss (Odin)');
    expect(links.hidden).toBe(true);

    heading.click();
    await fixture.whenStable();
    expect(heading.getAttribute('aria-expanded')).toBe('true');
    expect(links.hidden).toBe(false);

    fixture.componentInstance.fold();
    await fixture.whenStable();
    expect(heading.getAttribute('aria-expanded')).toBe('false');
    expect(links.hidden).toBe(true);
  });
});
