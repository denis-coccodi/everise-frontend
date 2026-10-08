import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TURNSTILE_SITE_KEY, TurnstileApi, TurnstileComponent } from './turnstile.component';

@Component({
  imports: [TurnstileComponent],
  template: `<cdt-turnstile action="login" (token)="token.set($event)" />`,
})
class HostComponent {
  readonly token = signal<string | null>('unset');
  readonly widget = viewChild.required(TurnstileComponent);
}

type Options = Parameters<TurnstileApi['render']>[1];

// Turnstile's script, already on the page: records what it was asked.
function fakeTurnstile() {
  const calls = { rendered: [] as Options[], reset: [] as string[], removed: [] as string[] };
  const api: TurnstileApi = {
    render: (_container, options) => {
      calls.rendered.push(options);
      return 'widget-1';
    },
    reset: (id) => calls.reset.push(id),
    remove: (id) => calls.removed.push(id),
  };
  (window as Window & { turnstile?: TurnstileApi }).turnstile = api;
  return calls;
}

async function render(siteKey: string) {
  await TestBed.configureTestingModule({
    imports: [HostComponent],
    providers: [{ provide: TURNSTILE_SITE_KEY, useValue: siteKey }],
  }).compileComponents();
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  // The widget renders after the script's promise settles.
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
  return { fixture, root: fixture.nativeElement as HTMLElement };
}

describe('TurnstileComponent', () => {
  afterEach(() => {
    delete (window as Window & { turnstile?: TurnstileApi }).turnstile;
  });

  it('renders the widget for its form, in the page’s colour mode, and passes its token on', async () => {
    const calls = fakeTurnstile();
    const { fixture } = await render('site-key');

    expect(calls.rendered).toHaveLength(1);
    expect(calls.rendered[0]).toMatchObject({ sitekey: 'site-key', action: 'login', theme: 'dark', language: 'auto' });

    calls.rendered[0].callback('token-1');
    expect(fixture.componentInstance.token()).toBe('token-1');

    calls.rendered[0]['expired-callback']();
    expect(fixture.componentInstance.token()).toBeNull();
  });

  it('reset() asks for a new token and forgets the used one', async () => {
    const calls = fakeTurnstile();
    const { fixture } = await render('site-key');
    calls.rendered[0].callback('token-1');

    fixture.componentInstance.widget().reset();

    expect(calls.reset).toEqual(['widget-1']);
    expect(fixture.componentInstance.token()).toBeNull();
  });

  it('says so when the check fails, and removes the widget with the form', async () => {
    const calls = fakeTurnstile();
    const { fixture, root } = await render('site-key');

    calls.rendered[0]['error-callback']();
    fixture.detectChanges();

    const alert = root.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("The check that you're not a bot failed.");
    fixture.destroy();
    expect(calls.removed).toEqual(['widget-1']);
  });

  it('shows nothing and loads nothing without a site key', async () => {
    const calls = fakeTurnstile();
    const { root } = await render('');

    expect(calls.rendered).toHaveLength(0);
    expect((root.querySelector('cdt-turnstile') as HTMLElement).hidden).toBe(true);
  });
});
