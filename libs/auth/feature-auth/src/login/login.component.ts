import { InputErrorsComponent, ListErrorsComponent } from '@everise/core/forms';
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import {
  ButtonComponent,
  FieldComponent,
  InputComponent,
  TURNSTILE_SITE_KEY,
  TurnstileComponent,
} from '@everise/ui/components';
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
    TurnstileComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly authStore = inject(AuthStore);
  private readonly fb = inject(FormBuilder);

  // Set when the password was right but the email isn't confirmed yet.
  protected readonly unconfirmed = this.authStore.awaitingConfirmation;

  // The bot check's pass; with a site key, the form waits for it.
  private readonly botCheck = viewChild.required(TurnstileComponent);
  private readonly checked = !!inject(TURNSTILE_SITE_KEY);
  protected readonly turnstileToken = signal<string | null>(null);
  protected readonly waitingForCheck = computed(() => this.checked && !this.turnstileToken());

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  onSubmit() {
    this.authStore.login({ user: this.form.getRawValue(), turnstileToken: this.turnstileToken() ?? undefined });
    // Keep the email, so a wrong password only needs the password again.
    this.form.controls.password.reset();
    // A pass works once: the next try needs a new one.
    this.botCheck().reset();
  }
}
