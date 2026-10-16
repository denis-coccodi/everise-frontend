import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NavGroupComponent } from './nav-group.component';
import { NAV_GROUPS } from './nav-groups';

@Component({ template: '' })
class BlankComponent {}

const community = NAV_GROUPS[0];

describe('NavGroupComponent', () => {
  async function render(variant: 'menu' | 'list') {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', component: BlankComponent }])] });
    const fixture = TestBed.createComponent(NavGroupComponent);
    fixture.componentRef.setInput('group', community);
    fixture.componentRef.setInput('variant', variant);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const links = () => [...host.querySelectorAll('a')] as HTMLAnchorElement[];
    const go = async (url: string) => {
      await TestBed.inject(Router).navigateByUrl(url);
      await fixture.whenStable();
    };
    return { host, links, go };
  }

  afterEach(() => document.body.replaceChildren());

  it("is a menu named after the group, holding its pages' links", async () => {
    const { host, links } = await render('menu');

    const trigger = host.querySelector('button[aria-haspopup=menu]') as HTMLButtonElement;
    expect(trigger.textContent?.trim()).toBe('Community');
    expect(host.querySelector('[role=menu]')?.getAttribute('aria-label')).toBe('Community');
    expect(links().map((a) => a.textContent?.trim())).toEqual(['Party Finder', 'Venues', 'Events', 'The Waking Sands']);
    expect(links().map((a) => a.getAttribute('href'))).toEqual([
      '/party-finder?dc=light&world=odin',
      '/venues',
      '/events',
      '/waking-sands',
    ]);
    expect(links().every((a) => a.getAttribute('role') === 'menuitem')).toBe(true);
  });

  it('marks the menu, and its page, while one of its pages is shown, whatever the query or below it', async () => {
    const { host, links, go } = await render('menu');
    const trigger = () => host.querySelector('button[aria-haspopup=menu]') as HTMLButtonElement;
    expect(trigger().classList).not.toContain('active');

    await go('/party-finder?dc=chaos&slot=healer');
    expect(trigger().classList).toContain('active');
    expect(links()[0].getAttribute('aria-current')).toBe('page');
    expect(links()[1].getAttribute('aria-current')).toBeNull();

    await go('/party-finder/listings/light-1-1');
    expect(trigger().classList).toContain('active');

    await go('/market-history');
    expect(trigger().classList).not.toContain('active');
  });

  it("lists the group's links under its name in the phone panel", async () => {
    const { host, links, go } = await render('list');

    const heading = host.querySelector('.heading') as HTMLElement;
    expect(heading.textContent?.trim()).toBe('Community');
    expect(host.querySelector('ul')?.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(links().map((a) => a.textContent?.trim())).toEqual(['Party Finder', 'Venues', 'Events', 'The Waking Sands']);
    expect(host.querySelector('[role=menu]')).toBeNull();

    await go('/waking-sands');
    expect(links()[3].getAttribute('aria-current')).toBe('page');
  });
});
