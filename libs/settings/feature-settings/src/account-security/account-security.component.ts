import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountChangesStore, AuthStore, resetEmailState } from '@everise/auth/data-access';
import { ButtonComponent, MessageComponent } from '@everise/ui/components';
import { ChangeEmailDialogComponent } from '../change-email-dialog/change-email-dialog.component';
import { ChangePasswordDialogComponent } from '../change-password-dialog/change-password-dialog.component';
import { SignInMethodsComponent } from '../sign-in-methods/sign-in-methods.component';

// In the settings, apart from the profile: how the account is signed in to.
// The email address and the password each show what they are, with a button
// opening a window to change them (asking for the current password), as big
// sites do; then the connected accounts and signing out everywhere.
@Component({
  selector: 'cdt-account-security',
  templateUrl: './account-security.component.html',
  styleUrl: './account-security.component.scss',
  imports: [
    ButtonComponent,
    MessageComponent,
    RouterLink,
    SignInMethodsComponent,
    ChangeEmailDialogComponent,
    ChangePasswordDialogComponent,
  ],
  providers: [AccountChangesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountSecurityComponent {
  private readonly authStore = inject(AuthStore);
  protected readonly store = inject(AccountChangesStore);

  protected readonly user = this.authStore.user;
  // An account made with Google or Discord has none: it sets one with a
  // code by email, as for a forgotten password.
  protected readonly hasPassword = computed(() => this.user().signInMethods.includes('password'));
  // The code form, with the account's address filled in.
  protected readonly setPasswordState = computed(() => resetEmailState(this.user().email));

  protected signOutEverywhere() {
    this.authStore.logoutEverywhere();
  }
}
