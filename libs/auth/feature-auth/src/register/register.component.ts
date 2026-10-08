import { InputErrorsComponent, ListErrorsComponent } from '@everise/core/forms';
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
    ReactiveFormsModule,
    InputErrorsComponent,
    SocialSignInComponent,
    CheckEmailComponent,
    TurnstileComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly authStore = inject(AuthStore);
  private readonly fb = inject(FormBuilder);

  // Where the confirmation link went, once one has.
  protected readonly linkSentTo = this.authStore.awaitingConfirmation;

  // The bot check's pass; with a site key, the form waits for it.
  private readonly botCheck = viewChild(TurnstileComponent);
  private readonly checked = !!inject(TURNSTILE_SITE_KEY);
  protected readonly turnstileToken = signal<string | null>(null);
  protected readonly waitingForCheck = computed(() => this.checked && !this.turnstileToken());

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  onSubmit() {
    this.authStore.register({ user: this.form.getRawValue(), turnstileToken: this.turnstileToken() ?? undefined });
    // Keep the name and email, so a problem only needs that field fixed.
    this.form.controls.password.reset();
    // A pass works once: the next try needs a new one.
    this.botCheck()?.reset();
  }
}
