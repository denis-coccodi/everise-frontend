import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const SITE_NAME = 'Everise';

// Every page has its own title (WCAG 2.4.2): a route's `title`, then the
// site's name, e.g. "Sign in · Everise". Pages whose title comes from their
// data (an article) set it themselves once it has loaded.
@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot) {
    const page = this.buildTitle(snapshot);
    this.title.setTitle(page ? `${page} · ${SITE_NAME}` : SITE_NAME);
  }
}
