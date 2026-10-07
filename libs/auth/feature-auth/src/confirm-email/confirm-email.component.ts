import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService, AuthStore } from '@everise/auth/data-access';
import { serverMessage } from '@everise/core/forms';
import { ButtonComponent } from '@everise/ui/components';

type State = { kind: 'confirming' } | { kind: 'confirmed'; username: string } | { kind: 'failed'; message: string };

// Where the link in a confirmation email leads (/confirm-email?token=…): it
// confirms the address and signs in.
@Component({
  selector: 'cdt-confirm-email',
  template: `
    <div class="auth-page">
      <div class="container page">
        <div class="row">
          <div class="col-md-6 offset-md-3 col-xs-12 text-xs-center">
            <h1>Confirm your email</h1>
            <div role="status">
              @switch (state().kind) {
                @case ('confirming') {
                  <p>Confirming…</p>
                }
                @case ('confirmed') {
                  <p>Your email address is confirmed. Welcome to Everise, {{ username() }}!</p>
                  <a cdtButton routerLink="/home">Go to the home page</a>
                }
                @case ('failed') {
                  <p>{{ message() }}</p>
                  <a cdtButton="outline-secondary" routerLink="/login">Sign in</a>
                }
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  imports: [ButtonComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmEmailComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);

  // From the link's ?token=, through the router's input binding.
  readonly token = input<string>();

  protected readonly state = signal<State>({ kind: 'confirming' });

  ngOnInit() {
    const token = this.token();
    if (!token) {
      this.state.set({ kind: 'failed', message: 'This link is incomplete. Copy the whole link from the email.' });
      return;
    }
    this.authService.confirmEmail(token).subscribe({
      next: ({ user }) => {
        this.authStore.confirmed(user);
        this.state.set({ kind: 'confirmed', username: user.username });
      },
      error: (error: unknown) => this.state.set({ kind: 'failed', message: serverMessage(error) }),
    });
  }

  protected username() {
    const state = this.state();
    return state.kind === 'confirmed' ? state.username : '';
  }

  protected message() {
    const state = this.state();
    return state.kind === 'failed' ? state.message : '';
  }
}
