import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  InjectionToken,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MessageComponent } from '../message/message.component';

// Cloudflare Turnstile's site key (public), from the app's environment.
// Empty: no bot check, and the forms don't wait for a token.
export const TURNSTILE_SITE_KEY = new InjectionToken<string>('TURNSTILE_SITE_KEY', { factory: () => '' });

// The parts of Turnstile's script the component uses.
interface TurnstileOptions {
  sitekey: string;
  action: string;
  theme: 'light' | 'dark';
  size: 'flexible' | 'compact';
  language: 'auto';
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
}
export interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileOptions): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}
type WithTurnstile = Window & { turnstile?: TurnstileApi };

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
// The flexible widget is at least 300 px wide; narrower screens get the compact one.
const FLEXIBLE_MIN_WIDTH = '(min-width: 360px)';

let loading: Promise<TurnstileApi> | undefined;

// Loads Turnstile's script once for the whole site.
function loadTurnstile(document: Document): Promise<TurnstileApi> {
  const window = document.defaultView as WithTurnstile;
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('no turnstile')));
    script.onerror = () => {
      loading = undefined;
      reject(new Error('turnstile script failed'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

// Cloudflare Turnstile, the check that a form is sent by a person:
// <cdt-turnstile action="login" (token)="token.set($event)" />. Usually it
// passes by itself; sometimes it asks for a click. `token` gives the pass
// for the form's request, or null when it expired or failed. A token works
// once: call reset() after each request for a new one. Without a site key
// it shows nothing.
@Component({
  selector: 'cdt-turnstile',
  template: `
    <div #widget class="widget"></div>
    <cdt-message tone="error">{{ problem() }}</cdt-message>
  `,
  styleUrl: './turnstile.component.scss',
  imports: [MessageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[hidden]': '!siteKey' },
})
export class TurnstileComponent {
  private readonly document = inject(DOCUMENT);
  protected readonly siteKey = inject(TURNSTILE_SITE_KEY);
  private readonly container = viewChild.required<ElementRef<HTMLElement>>('widget');

  // Which form this is (signup, login, resend); the backend checks it.
  readonly action = input.required<string>();
  readonly token = output<string | null>();
  protected readonly problem = signal('');

  private api?: TurnstileApi;
  private widgetId?: string;

  constructor() {
    afterNextRender(() => {
      if (this.siteKey) this.render();
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.api && this.widgetId !== undefined) this.api.remove(this.widgetId);
    });
  }

  // A new token, e.g. after the last one was sent.
  reset() {
    this.token.emit(null);
    if (this.api && this.widgetId !== undefined) this.api.reset(this.widgetId);
  }

  private async render() {
    try {
      this.api = await loadTurnstile(this.document);
    } catch {
      this.problem.set(
        "The check that you're not a bot didn't load. Reload the page, or allow challenges.cloudflare.com in your blocker.",
      );
      return;
    }
    const view = this.document.defaultView;
    this.widgetId = this.api.render(this.container().nativeElement, {
      sitekey: this.siteKey,
      action: this.action(),
      theme: this.document.body.classList.contains('light') ? 'light' : 'dark',
      size: view?.matchMedia?.(FLEXIBLE_MIN_WIDTH).matches === false ? 'compact' : 'flexible',
      language: 'auto',
      callback: (token) => {
        this.problem.set('');
        this.token.emit(token);
      },
      'expired-callback': () => this.token.emit(null),
      'error-callback': () => {
        this.token.emit(null);
        this.problem.set("The check that you're not a bot failed. Wait a moment; it tries again by itself.");
      },
    });
  }
}
