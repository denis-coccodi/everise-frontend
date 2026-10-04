import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// One tab in a <ul cdtTabs>: <a cdtTab [active]="...">Your Feed</a>. Tabs that
// are links can use routerLinkActive="active" instead of [active].
@Component({
  selector: 'a[cdtTab], button[cdtTab]',
  template: '<ng-content />',
  styleUrl: './tab.component.scss',
  host: {
    '[class.active]': 'active()',
    '[attr.aria-current]': "active() ? 'page' : null",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabComponent {
  readonly active = input(false);
}
