import { ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';

// One tab in a <ul cdtTabs>. A tab that changes the page is a link,
// <a cdtTab routerLink="..." routerLinkActive="active">; one that changes what
// the page shows is a button, <button type="button" cdtTab [active]="...">, so
// both work from the keyboard. <span cdtTab [active]="true"> shows a current
// filter that can't be chosen. The active tab is aria-current: "page" for a
// link, "true" otherwise.
@Component({
  selector: 'a[cdtTab], button[cdtTab], span[cdtTab]',
  template: '<ng-content />',
  styleUrl: './tab.component.scss',
  host: {
    '[class.active]': 'active()',
    '[attr.aria-current]': 'active() ? current : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabComponent {
  readonly active = input(false);

  protected readonly current = inject(ElementRef).nativeElement.tagName === 'A' ? 'page' : 'true';
}
