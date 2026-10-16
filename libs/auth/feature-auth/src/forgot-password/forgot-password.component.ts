import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormField, FormRoot, email, form, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { PasswordResetStore } from '@everise/auth/data-access';
import { InputErrorsComponent, ListErrorsComponent } from '@everise/core/forms';
import {
  ButtonComponent,
  FieldComponent,
  InputComponent,
  MessageComponent,
  TURNSTILE_SITE_KEY,
  TurnstileComponent,
} from '@everise/ui/components';

// "Forgot password?" on the sign-in page: emails a code to choose a new
// password with (/reset-password).
@Component({
  selector: 'cdt-forgot-password',
  templateUrl: './forgot-password.component.html',
  imports: [
    ButtonComponent,
    FieldComponent,
    InputComponent,
    InputErrorsComponent,
    ListErrorsComponent,
    MessageComponent,
    TurnstileComponent,
    FormField,
    FormRoot,
    RouterLink,
  ],
  providers: [PasswordResetStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  protected readonly store = inject(PasswordResetStore);

  // The bot check's pass; with a site key, the form waits for it.
  private readonly botCheck = viewChild.required(TurnstileComponent);
  private readonly checked = !!inject(TURNSTILE_SITE_KEY);
  protected readonly turnstileToken = signal<string | null>(null);
  protected readonly waitingForCheck = computed(() => this.checked && !this.turnstileToken());

  private readonly model = signal({ email: '' });
  protected readonly form = form(
    this.model,
    (path) => {
      required(path.email);
      email(path.email);
    },
    { submission: { action: async () => this.send() } },
  );

  private send() {
    this.store.requestCode({ user: this.model(), turnstileToken: this.turnstileToken() ?? undefined });
    // A pass works once: asking again needs a new one.
    this.botCheck().reset();
  }
}
