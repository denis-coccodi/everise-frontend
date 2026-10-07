import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type MessageTone = 'status' | 'warning' | 'error';

// A line that tells the person what happened: <cdt-message>Saved.</cdt-message>,
// <cdt-message tone="error">{{ error }}</cdt-message>. A status or warning is
// a polite live region (role="status"), an error an assertive one
// (role="alert"). Keep it on the page while empty, so screen readers hear
// the message when it appears; an empty status keeps its line's height, so
// the page doesn't jump.
@Component({
  selector: 'cdt-message',
  template: '<ng-content />',
  styleUrl: './message.component.scss',
  host: {
    '[attr.role]': "tone() === 'error' ? 'alert' : 'status'",
    '[attr.data-tone]': 'tone()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageComponent {
  readonly tone = input<MessageTone>('status');
}
