import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { AuthService } from '@realworld/auth/data-access';
import { FAILURE_MESSAGE, UNREACHABLE_MESSAGE } from '@realworld/core/forms';
import { ButtonComponent, PanelComponent } from '@realworld/ui/components';

// "Check your email": a confirmation link went to `email`, after signing up
// or signing in before opening it. It can be sent again; the backend allows
// once a minute and says so.
@Component({
  selector: 'cdt-check-email',
  template: `
    <cdt-panel class="check-email" heading="Check your email">
      <p>
        We sent a link to <strong>{{ email() }}</strong
        >. Open it to confirm your address and sign in. It works for 24 hours.
      </p>
      <p class="hint">Nothing there? Look in your spam folder, or send it again.</p>
      <button type="button" cdtButton="outline-secondary" size="sm" [disabled]="sending()" (click)="resend()">
        Send the link again
      </button>
      <p class="status" role="status">{{ status() }}</p>
    </cdt-panel>
  `,
  styleUrl: './check-email.component.scss',
  imports: [ButtonComponent, PanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckEmailComponent {
  private readonly authService = inject(AuthService);

  readonly email = input.required<string>();
  protected readonly sending = signal(false);
  protected readonly status = signal('');

  protected resend() {
    this.sending.set(true);
    this.status.set('');
    this.authService.resendConfirmation(this.email()).subscribe({
      next: () => {
        this.sending.set(false);
        this.status.set(`Sent again to ${this.email()}.`);
      },
      error: (response: HttpErrorResponse) => {
        this.sending.set(false);
        const message = response.error?.errors?.body?.[0];
        this.status.set(
          typeof message === 'string' ? message : response.status === 0 ? UNREACHABLE_MESSAGE : FAILURE_MESSAGE,
        );
      },
    });
  }
}
