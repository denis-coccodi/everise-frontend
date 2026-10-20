import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService, AuthStore } from '@everise/auth/data-access';
import { catchError, map, of } from 'rxjs';

const PROVIDERS = [
  { id: 'google', name: 'Google', icon: 'assets/images/google.svg' },
  { id: 'discord', name: 'Discord', icon: 'assets/images/discord.svg' },
] as const;

// In the settings' account section: the Google and Discord accounts tied
// to this one, with a word on how to tie the others.
// Providers the backend isn't set up for are only listed when already tied;
// with none at all, nothing shows.
@Component({
  selector: 'cdt-sign-in-methods',
  templateUrl: './sign-in-methods.component.html',
  styleUrl: './sign-in-methods.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInMethodsComponent {
  private readonly authStore = inject(AuthStore);

  private readonly available = toSignal(
    inject(AuthService)
      .providers()
      .pipe(
        map(({ providers }) => providers),
        catchError(() => of<string[]>([])),
      ),
    { initialValue: [] as string[] },
  );

  private readonly methods = computed(() => this.authStore.user().signInMethods ?? []);

  protected readonly providers = computed(() =>
    PROVIDERS.map((provider) => ({ ...provider, tied: this.methods().includes(provider.id) })).filter(
      (provider) => provider.tied || this.available().includes(provider.id),
    ),
  );
}
