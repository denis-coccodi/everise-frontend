import { ChangeDetectionStrategy, Component, DOCUMENT, inject, input, signal } from '@angular/core';

// Shows the password typed in a field, to check it for typos, and hides it
// again: <cdt-show-password for="password" /> right after the input, in its
// <cdt-field>, `for` being the input's id. It shows at the end of the label's
// line, but the keyboard reaches it after the field. A text button whose
// words say what it does next ("Show" / "Hide"), named with the word
// "password" for screen readers. Used instead of typing a new password
// twice, as sign-up guidance recommends.
@Component({
  selector: 'cdt-show-password',
  template: `
    <button type="button" class="toggle" [attr.aria-controls]="for()" (click)="toggle()">
      {{ shown() ? 'Hide' : 'Show' }}<span class="visually-hidden"> password</span>
    </button>
  `,
  styleUrl: './show-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowPasswordComponent {
  private readonly document = inject(DOCUMENT);

  // The password input's id.
  readonly for = input.required<string>();

  protected readonly shown = signal(false);

  protected toggle() {
    const field = this.document.getElementById(this.for());
    if (!(field instanceof HTMLInputElement)) return;
    const shown = !this.shown();
    field.type = shown ? 'text' : 'password';
    this.shown.set(shown);
  }
}
