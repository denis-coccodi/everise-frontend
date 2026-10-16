import { InputErrorsComponent, ListErrorsComponent } from '@everise/core/forms';
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormField, FormRoot, email, form, minLength, required } from '@angular/forms/signals';
import { RouterModule } from '@angular/router';
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
  selector: 'cdt-register',
  templateUrl: './register.component.html',
  imports: [
    FieldComponent,
    ButtonComponent,
    InputComponent,
    ListErrorsComponent,
    RouterModule,
    FormField,
    FormRoot,
    InputErrorsComponent,
    SocialSignInComponent,
    CheckEmailComponent,
    TurnstileComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly authStore = inject(AuthStore);

  // Where the confirmation link went, once one has.
  protected readonly linkSentTo = this.authStore.awaitingConfirmation;

  // The bot check's pass; with a site key, the form waits for it.
  private readonly botCheck = viewChild(TurnstileComponent);
  private readonly checked = !!inject(TURNSTILE_SITE_KEY);
  protected readonly turnstileToken = signal<string | null>(null);
  protected readonly waitingForCheck = computed(() => this.checked && !this.turnstileToken());

  private readonly newUser = signal({ username: '', email: '', password: '' });
  protected readonly form = form(
    this.newUser,
    (path) => {
      required(path.username);
      required(path.email);
      email(path.email);
      required(path.password);
      minLength(path.password, 8);
    },
    { submission: { action: async () => this.signUp() } },
  );

  private signUp() {
    this.authStore.register({ user: this.newUser(), turnstileToken: this.turnstileToken() ?? undefined });
    // Keep the name and email, so a problem only needs that field fixed.
    this.form.password().reset('');
    // A pass works once: the next try needs a new one.
    this.botCheck()?.reset();
  }
}
