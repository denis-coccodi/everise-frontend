import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent, MenuComponent, MenuItemComponent } from '@everise/ui/components';
import { filter, map } from 'rxjs';
import { NavGroup, PAGE_MATCH } from './nav-groups';

// A group of the navbar's pages. In the bar (from md up), a menu button
// named after the group, marked while one of its pages is shown; in the
// phone's panel, the group's name over its links.
@Component({
  selector: 'cdt-nav-group',
  templateUrl: './nav-group.component.html',
  styleUrl: './nav-group.component.scss',
  imports: [RouterLink, RouterLinkActive, IconComponent, MenuComponent, MenuItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavGroupComponent {
  readonly group = input.required<NavGroup>();
  readonly variant = input<'menu' | 'list'>('menu');

  protected readonly match = PAGE_MATCH;
  protected readonly headingId = computed(() => `nav-group-${this.group().label.toLowerCase()}`);

  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  // One of the group's pages is shown.
  protected readonly active = computed(() => {
    this.url();
    return this.group().pages.some((page) => this.router.isActive(page.path, PAGE_MATCH));
  });
}
