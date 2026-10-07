import { InputErrorsComponent, ListErrorsComponent } from '@everise/core/forms';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import { ButtonComponent, FieldComponent, InputComponent } from '@everise/ui/components';
import { CheckEmailComponent } from '../check-email/check-email.component';
import { SocialSignInComponent } from '../social-sign-in/social-sign-in.component';

@Component({
  selector: 'cdt-login',
  templateUrl: './login.component.html',
  imports: [
    FieldComponent,
    ButtonComponent,
    InputComponent,
    ListErrorsComponent,
    RouterLink,
    ReactiveFormsModule,
    InputErrorsComponent,
    SocialSignInComponent,
    CheckEmailComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly authStore = inject(AuthStore);
  private readonly fb = inject(FormBuilder);

  // Set when the password was right but the email isn't confirmed yet.
  protected readonly unconfirmed = this.authStore.awaitingConfirmation;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  onSubmit() {
    this.authStore.login(this.form.getRawValue());
    // Keep the email, so a wrong password only needs the password again.
    this.form.controls.password.reset();
  }
}
