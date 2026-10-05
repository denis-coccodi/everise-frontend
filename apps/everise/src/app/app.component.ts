import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { AuthStore } from '@realworld/auth/data-access';
import { SettingsStore } from '@realworld/settings/data-access';
import { filter } from 'rxjs';
import { FooterComponent } from './layout/footer/footer.component';
import { NavbarComponent } from './layout/navbar/navbar.component';

// The page a URL shows: the path's first two segments, so /profile/Thancred
// and /profile/Thancred/favorites are one page with two tabs.
function pageOf(url: string) {
  return url.split(/[?#]/)[0].split('/').filter(Boolean).slice(0, 2).join('/');
}

@Component({
  selector: 'cdt-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [FooterComponent, NavbarComponent, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  protected readonly authStore = inject(AuthStore);
  protected readonly settingsStore = inject(SettingsStore);

  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  constructor() {
    this.authStore.getUser();

    // A signed-in user's saved colour mode wins over this browser's copy.
    effect(() => {
      const darkMode = this.authStore.user().darkMode;
      if (this.authStore.loggedIn() && darkMode !== undefined) {
        untracked(() => this.settingsStore.setDarkMode(darkMode));
      }
    });
    window.addEventListener('online', () => {
      navigator.serviceWorker.controller?.postMessage('sync-favorites');
    });

    // On a new page, the focus moves to its content, as a page load would
    // start there, so keyboard and screen reader users don't stay on the
    // link they used (WCAG 2.4.3). Tabs within a page keep the focus.
    let page: string | null = null;
    const subscription = inject(Router)
      .events.pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const next = pageOf(event.urlAfterRedirects);
        if (page !== null && next !== page) {
          this.main().nativeElement.focus();
        }
        page = next;
      });
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  // An in-page link to #main would go through the router; this moves the
  // focus and scrolls there without changing the URL.
  protected skipToMain(event: Event) {
    event.preventDefault();
    this.main().nativeElement.focus();
  }
}
