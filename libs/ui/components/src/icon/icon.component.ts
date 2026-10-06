import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName = 'menu' | 'close' | 'shuffle' | 'compose';

// A small line icon drawn in the page itself, so it shows even when no icon
// font loads (data saving, slow connections, content blockers). It takes the
// text colour and size around it: <cdt-icon name="menu" />. It is decorative
// and hidden from screen readers; the text or label next to it says what it is.
@Component({
  selector: 'cdt-icon',
  template: `
    <svg viewBox="0 0 24 24" focusable="false">
      @switch (name()) {
        @case ('menu') {
          <path d="M4 7h16M4 12h16M4 17h16" />
        }
        @case ('close') {
          <path d="M6 6l12 12M18 6L6 18" />
        }
        @case ('shuffle') {
          <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
        }
        @case ('compose') {
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
        }
      }
    </svg>
  `,
  styleUrl: './icon.component.scss',
  host: { 'aria-hidden': 'true', '[attr.data-icon]': 'name()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  readonly name = input.required<IconName>();
}
