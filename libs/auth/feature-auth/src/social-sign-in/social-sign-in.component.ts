import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '@realworld/auth/data-access';
import { FormErrorsStore } from '@realworld/core/forms';
import { API_URL } from '@realworld/core/http-client';
import { ButtonComponent } from '@realworld/ui/components';
import { catchError, map, of } from 'rxjs';

const PROVIDERS: Record<string, { name: string; icon: string }> = {
  google: { name: 'Google', icon: 'assets/images/google.svg' },
  facebook: { name: 'Facebook', icon: 'assets/images/facebook.svg' },
  microsoft: { name: 'Microsoft', icon: 'assets/images/microsoft.svg' },
  discord: { name: 'Discord', icon: 'assets/images/discord.svg' },
};

// Why a sign-in through a provider didn't finish: the backend sends
// the person back to /login?social=<problem>.
export const SOCIAL_SIGN_IN_PROBLEMS: Record<string, string> = {
  cancelled: 'Signing in was cancelled. Try again, or use your email and password.',
  expired: 'That sign-in took too long, or was started in another tab. Please try again.',
  'no-email':
    "That account didn't share a confirmed email address, which your Everise account needs. Confirm your email with that service and allow sharing it, or sign up with your email and a password.",
  failed: "Signing in that way didn't work. Please try again in a moment.",
  unavailable: "That way of signing in isn't available right now. Use your email and password instead.",
};

// "Continue with Google / Facebook / Microsoft / Discord", on the sign-in
// and sign-up pages: one button both signs in and signs up. Each is a plain link to the backend,
// which takes the person to the provider and back, signed in. Only the
// providers the backend is set up for are shown.
@Component({
  selector: 'cdt-social-sign-in',
  templateUrl: './social-sign-in.component.html',
  styleUrl: './social-sign-in.component.scss',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialSignInComponent {
  private readonly apiUrl = inject(API_URL);

  protected readonly providers = toSignal(
    inject(AuthService)
      .providers()
      .pipe(
        map(({ providers }) =>
          providers
            .filter((id) => PROVIDERS[id])
            .map((id) => ({ id, ...PROVIDERS[id], href: `${this.apiUrl}/auth/${id}` })),
        ),
        catchError(() => of([])),
      ),
    { initialValue: [] },
  );

  constructor() {
    const problem = inject(ActivatedRoute).snapshot.queryParamMap.get('social');
    if (problem) {
      inject(FormErrorsStore).setErrors({
        body: [SOCIAL_SIGN_IN_PROBLEMS[problem] ?? SOCIAL_SIGN_IN_PROBLEMS['failed']],
      });
    }
  }
}
