import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, FormRoot, form, maxLength, minLength, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { AccountChangesStore, AuthStore, resetEmailState } from '@everise/auth/data-access';
import { InputErrorsComponent, sameAs } from '@everise/core/forms';
import {
  ButtonComponent,
  DialogComponent,
  FieldComponent,
  InputComponent,
  MessageComponent,
} from '@everise/ui/components';

// The window for a new password: the current one, then the new one twice.
// Every other device is signed out; this one stays signed in.
@Component({
  selector: 'cdt-change-password-dialog',
  templateUrl: './change-password-dialog.component.html',
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
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordDialogComponent {
  protected readonly store = inject(AccountChangesStore);
  // The account's sign-in name, in a hidden field of the form: Chrome and
  // other password managers need it to see a password change for that
  // account, to suggest a strong password and to save it.
  protected readonly email = inject(AuthStore).user().email;
  // Forgot the current one: the code form, with the address filled in.
  protected readonly forgotState = resetEmailState(this.email);

  private readonly model = signal({ currentPassword: '', password: '', repeat: '' });
  protected readonly form = form(
    this.model,
    (path) => {
      required(path.currentPassword);
      required(path.password);
      // The backend's rules: bcrypt reads 72 bytes at most.
      minLength(path.password, 8);
      maxLength(path.password, 72);
      required(path.repeat);
      sameAs(path.repeat, path.password);
    },
    { submission: { action: async () => this.save() } },
  );

  // The element, not the cdtInput component on it.
  private readonly firstField = viewChild.required('firstField', { read: ElementRef<HTMLInputElement> });

  constructor() {
    afterNextRender(() => this.firstField().nativeElement.focus());
  }

  private save() {
    const { currentPassword, password } = this.model();
    this.store.changePassword({ currentPassword, password });
  }
}
