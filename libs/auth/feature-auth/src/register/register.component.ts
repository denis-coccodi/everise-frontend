import { InputErrorsComponent, ListErrorsComponent } from '@everise/core/forms';
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormField, FormRoot, email, form, maxLength, minLength, required } from '@angular/forms/signals';
import { RouterModule } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import {
  ButtonComponent,
  FieldComponent,
  IconComponent,
  InputComponent,
  PanelComponent,
  ShowPasswordComponent,
  TURNSTILE_SITE_KEY,
  TurnstileComponent,
} from '@everise/ui/components';
import { CheckEmailComponent } from '../check-email/check-email.component';
import { SocialSignInComponent } from '../social-sign-in/social-sign-in.component';

// The sign-up form, in a window: what signs in first (email, password with
// its rule shown up front and a "Show" button), then the username, set
// apart: it's only how others see you.
@Component({
  selector: 'cdt-register',
  templateUrl: './register.component.html',
  styleUrls: ['../auth-page.scss', './register.component.scss'],
  imports: [
    FieldComponent,
    ButtonComponent,
    IconComponent,
    InputComponent,
    PanelComponent,
    ShowPasswordComponent,
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

  private readonly newUser = signal({ email: '', password: '', username: '' });
  protected readonly form = form(
    this.newUser,
    (path) => {
      required(path.email);
      email(path.email);
      required(path.password);
      // The backend's rules: bcrypt reads 72 bytes at most.
      minLength(path.password, 8);
      maxLength(path.password, 72);
      required(path.username);
    },
    { submission: { action: async () => this.signUp() } },
  );

  // The password rule, ticked as soon as it's met.
  protected readonly passwordFits = computed(() => {
    const { length } = this.newUser().password;
    return length >= 8 && length <= 72;
  });

  private signUp() {
    this.authStore.register({ user: this.newUser(), turnstileToken: this.turnstileToken() ?? undefined });
    // Keep the name and email, so a problem only needs that field fixed.
    this.form.password().reset('');
    // A pass works once: the next try needs a new one.
    this.botCheck()?.reset();
  }
}
