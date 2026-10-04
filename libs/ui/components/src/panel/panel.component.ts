import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// An FFXIV window: a trimmed panel with an optional title bar.
// <cdt-panel heading="Duty Finder Settings">...</cdt-panel>. Without a visible
// heading, `label` gives the window its accessible name. The look lives in
// theme/_shared.scss (.xiv-panel, .xiv-title-bar).
@Component({
  selector: 'cdt-panel',
  template: `
    @if (heading()) {
      <h2 class="xiv-title-bar">{{ heading() }}</h2>
    }
    <ng-content />
  `,
  host: {
    class: 'xiv-panel',
    '[attr.role]': "heading() || label() ? 'region' : null",
    '[attr.aria-label]': 'heading() || label() || null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelComponent {
  readonly heading = input('');
  readonly label = input('');
}
