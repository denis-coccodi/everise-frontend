import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { AuthService } from '@everise/auth/data-access';
import { serverMessage } from '@everise/core/forms';
import { ButtonComponent, MessageComponent, PanelComponent } from '@everise/ui/components';

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
      <cdt-message class="status">{{ status() }}</cdt-message>
    </cdt-panel>
  `,
  styleUrl: './check-email.component.scss',
  imports: [ButtonComponent, PanelComponent, MessageComponent],
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
      error: (error: unknown) => {
        this.sending.set(false);
        this.status.set(serverMessage(error));
      },
    });
  }
}
