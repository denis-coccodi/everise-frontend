import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { FormField, FormRoot, email, form, maxLength, minLength, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import { InputErrorsComponent, ListErrorsComponent, sameAs } from '@everise/core/forms';
import { SettingsStore } from '@everise/settings/data-access';
import { ButtonComponent, FieldComponent, InputComponent, SwitchComponent } from '@everise/ui/components';
import { AdminMembersComponent } from '../admin-members/admin-members.component';
import { AdminCharactersComponent } from '../admin-characters/admin-characters.component';
import { PictureSettingsComponent } from '../picture-settings/picture-settings.component';
import { SignInMethodsComponent } from '../sign-in-methods/sign-in-methods.component';

@Component({
  selector: 'cdt-settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  imports: [
    AdminMembersComponent,
    AdminCharactersComponent,
    FieldComponent,
    ButtonComponent,
    SwitchComponent,
    InputComponent,
    ListErrorsComponent,
    FormField,
    FormRoot,
    InputErrorsComponent,
    PictureSettingsComponent,
    SignInMethodsComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnDestroy {
  protected readonly authStore = inject(AuthStore);
  private readonly settingsStore = inject(SettingsStore);

  // An account made with Google or Discord has no password: it sets one
  // with a code by email ("Forgot your password?"), not here.
  protected readonly hasPassword = computed(() => this.authStore.user().signInMethods.includes('password'));

  // The password is only changed when a new one is typed, twice.
  private readonly settings = signal({
    username: '',
    bio: '',
    email: '',
    password: '',
    repeat: '',
    currentPassword: '',
    darkMode: this.settingsStore.darkMode(),
  });

  // A new password or email address needs the current password (the
  // backend checks it), when the account has one.
  protected readonly needsCurrentPassword = computed(() => {
    const { password, email } = this.settings();
    const newEmail = email.trim().toLowerCase() !== this.authStore.user().email.toLowerCase();
    return this.hasPassword() && (!!password || newEmail);
  });

  protected readonly form = form(
    this.settings,
    (path) => {
      required(path.username);
      required(path.email);
      email(path.email);
      // The backend's rules: bcrypt reads 72 bytes at most.
      minLength(path.password, 8);
      maxLength(path.password, 72);
      required(path.repeat, { when: ({ valueOf }) => !!valueOf(path.password) });
      sameAs(path.repeat, path.password);
      required(path.currentPassword, { when: () => this.needsCurrentPassword() });
    },
    { submission: { action: async () => this.save() } },
  );

  readonly setUserDataToForm = effect(() => {
    const userLoaded = this.authStore.getUserLoaded();
    if (userLoaded) {
      const { username, bio, email, darkMode } = this.authStore.user();
      this.settings.update((settings) => ({
        username,
        bio: bio ?? '',
        email,
        password: '',
        repeat: '',
        currentPassword: '',
        darkMode: darkMode ?? settings.darkMode,
      }));
    }
  });

  // Dark mode is saved with "Update Settings", but shows straight away.
  previewDarkMode(darkMode: boolean) {
    this.form.darkMode().value.set(darkMode);
    this.form.darkMode().markAsDirty();
    this.settingsStore.setDarkMode(darkMode);
  }

  // Leaving without saving puts the saved mode back.
  ngOnDestroy() {
    const saved = this.authStore.user().darkMode;
    if (saved !== undefined) {
      this.settingsStore.setDarkMode(saved);
    }
  }

  // The mode is saved only once it's the person's choice: one they saved
  // before, or the switch flipped; otherwise it keeps following the default.
  private save() {
    const { username, bio, email, password, currentPassword, darkMode } = this.settings();
    const chosen = this.authStore.user().darkMode !== undefined || this.form.darkMode().dirty();
    this.authStore.updateUser({
      username,
      bio,
      email,
      ...(chosen ? { darkMode } : {}),
      ...(password ? { password } : {}),
      ...(this.needsCurrentPassword() ? { currentPassword } : {}),
    });
    // Typed again for the next change, never kept.
    this.form.currentPassword().reset('');
  }
}
