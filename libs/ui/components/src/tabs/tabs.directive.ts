import { Directive, input } from '@angular/core';

// A themed tab bar: <ul cdtTabs><li><a cdtTab [active]="...">Your Feed</a></li></ul>.
// Tabs that are links can use routerLinkActive="active" instead of [active].
// The look lives in theme/_controls.scss (.nav-pills.outline-active).
@Directive({
  selector: 'ul[cdtTabs]',
  host: { class: 'nav nav-pills outline-active' },
})
export class TabsDirective {}

@Directive({
  selector: 'a[cdtTab], button[cdtTab]',
  host: {
    class: 'nav-link',
    '[class.active]': 'active()',
    '[attr.aria-current]': "active() ? 'page' : null",
  },
})
export class TabDirective {
  readonly active = input(false);
}
