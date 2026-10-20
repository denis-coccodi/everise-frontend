import { InputErrorsComponent, ListErrorsComponent } from '@everise/core/forms';
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormField, FormRoot, email, form, required } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import {
  ButtonComponent,
  FieldComponent,
  InputComponent,
  MessageComponent,
  PanelComponent,
  ShowPasswordComponent,
  TURNSTILE_SITE_KEY,
  TurnstileComponent,
} from '@everise/ui/components';
import { CheckEmailComponent } from '../check-email/check-email.component';
import { SocialSignInComponent } from '../social-sign-in/social-sign-in.component';

// The sign-in form, in a window like the sign-up's, with a "Show" button on
// the password.
@Component({
  selector: 'cdt-login',
  templateUrl: './login.component.html',
  styleUrls: ['../auth-page.scss', './login.component.scss'],
  imports: [
    FieldComponent,
    ButtonComponent,
    InputComponent,
    PanelComponent,
    ShowPasswordComponent,
    ListErrorsComponent,
    RouterLink,
    FormField,
    FormRoot,
    InputErrorsComponent,
    SocialSignInComponent,
    CheckEmailComponent,
    TurnstileComponent,
    MessageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly authStore = inject(AuthStore);

  // Sent here by a link from the Everise Discord (discordLinkGuard).
  protected readonly fromDiscord = inject(ActivatedRoute).snapshot.queryParamMap.get('from') === 'discord';

  // Set when the password was right but the email isn't confirmed yet.
  protected readonly unconfirmed = this.authStore.awaitingConfirmation;

  // The bot check's pass; with a site key, the form waits for it.
  private readonly botCheck = viewChild.required(TurnstileComponent);
  private readonly checked = !!inject(TURNSTILE_SITE_KEY);
  protected readonly turnstileToken = signal<string | null>(null);
  protected readonly waitingForCheck = computed(() => this.checked && !this.turnstileToken());

  private readonly credentials = signal({ email: '', password: '' });
  protected readonly form = form(
    this.credentials,
    (path) => {
      required(path.email);
      email(path.email);
      required(path.password);
    },
    { submission: { action: async () => this.signIn() } },
  );

  private signIn() {
    this.authStore.login({ user: this.credentials(), turnstileToken: this.turnstileToken() ?? undefined });
    // Keep the email, so a wrong password only needs the password again.
    this.form.password().reset('');
    // A pass works once: the next try needs a new one.
    this.botCheck().reset();
  }
}
