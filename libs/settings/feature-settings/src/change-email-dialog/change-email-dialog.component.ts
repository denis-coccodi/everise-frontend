import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, FormRoot, email, form, required, validate } from '@angular/forms/signals';
import { AccountChangesStore } from '@everise/auth/data-access';
import { InputErrorsComponent } from '@everise/core/forms';
import {
  ButtonComponent,
  DialogComponent,
  FieldComponent,
  InputComponent,
  MessageComponent,
} from '@everise/ui/components';

// The window for a new email address: it's used once the link sent to it is
// opened. Asks for the current password, when the account has one.
@Component({
  selector: 'cdt-change-email-dialog',
  templateUrl: './change-email-dialog.component.html',
  styleUrl: '../account-dialog.scss',
  imports: [
    ButtonComponent,
    DialogComponent,
    FieldComponent,
    InputComponent,
    InputErrorsComponent,
    MessageComponent,
    FormField,
    FormRoot,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangeEmailDialogComponent {
  protected readonly store = inject(AccountChangesStore);

  readonly currentEmail = input.required<string>();
  readonly hasPassword = input.required<boolean>();

  private readonly model = signal({ email: '', currentPassword: '' });
  protected readonly form = form(
    this.model,
    (path) => {
      required(path.email);
      email(path.email);
      validate(path.email, ({ value }) =>
        value().trim().toLowerCase() === this.currentEmail().toLowerCase() ? { kind: 'sameEmail' } : null,
      );
      required(path.currentPassword, { when: () => this.hasPassword() });
    },
    { submission: { action: async () => this.save() } },
  );

  // The element, not the cdtInput component on it.
  private readonly firstField = viewChild.required('firstField', { read: ElementRef<HTMLInputElement> });

  constructor() {
    // Straight into the window, on the new address.
    afterNextRender(() => this.firstField().nativeElement.focus());
  }

  private save() {
    const { email, currentPassword } = this.model();
    this.store.changeEmail({ email: email.trim(), ...(this.hasPassword() ? { currentPassword } : {}) });
  }
}
