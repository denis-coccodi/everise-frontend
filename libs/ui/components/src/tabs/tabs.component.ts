import { ChangeDetectionStrategy, Component } from '@angular/core';

// A themed tab bar: <ul cdtTabs><li><a cdtTab [active]="...">Your Feed</a></li></ul>.
// The tabs themselves are <a cdtTab> (tab.component.ts).
@Component({
  selector: 'ul[cdtTabs]',
  template: '<ng-content />',
  styleUrl: './tabs.component.scss',
  host: { role: 'list' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsComponent {}
