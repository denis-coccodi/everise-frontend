import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormField, FormRoot, form, maxLength, minLength, required } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PasswordResetStore } from '@everise/auth/data-access';
import { InputErrorsComponent, ListErrorsComponent, sameAs } from '@everise/core/forms';
import {
  ButtonComponent,
  FieldComponent,
  InputComponent,
  MessageComponent,
  TURNSTILE_SITE_KEY,
  TurnstileComponent,
} from '@everise/ui/components';

// Where the password reset email leads (/reset-password?code=…), or where
// the code is typed: a new password, typed twice. The code alone finds the
// account. Afterwards every device is signed out, so the person signs in
// again.
@Component({
  selector: 'cdt-reset-password',
  templateUrl: './reset-password.component.html',
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
export class ResetPasswordComponent {
  protected readonly store = inject(PasswordResetStore);

  // The bot check's pass; with a site key, the form waits for it.
  private readonly botCheck = viewChild.required(TurnstileComponent);
  private readonly checked = !!inject(TURNSTILE_SITE_KEY);
  protected readonly turnstileToken = signal<string | null>(null);
  protected readonly waitingForCheck = computed(() => this.checked && !this.turnstileToken());

  private readonly model = signal({
    // Filled in by the email's link.
    code: inject(ActivatedRoute).snapshot.queryParamMap.get('code') ?? '',
    password: '',
    repeat: '',
  });
  protected readonly form = form(
    this.model,
    (path) => {
      required(path.code);
      required(path.password);
      // The backend's rules: bcrypt reads 72 bytes at most.
      minLength(path.password, 8);
      maxLength(path.password, 72);
      required(path.repeat);
      sameAs(path.repeat, path.password);
    },
    { submission: { action: async () => this.save() } },
  );

  private save() {
    const { code, password } = this.model();
    this.store.reset({ code, password, turnstileToken: this.turnstileToken() ?? undefined });
    // A pass works once: another try needs a new one.
    this.botCheck().reset();
  }
}
