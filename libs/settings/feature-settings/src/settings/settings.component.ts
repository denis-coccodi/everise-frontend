import { ChangeDetectionStrategy, Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import { AuthStore } from '@everise/auth/data-access';
import { InputErrorsComponent, ListErrorsComponent } from '@everise/core/forms';
import { SettingsStore } from '@everise/settings/data-access';
import { ButtonComponent, FieldComponent, InputComponent, SwitchComponent } from '@everise/ui/components';
import { AccountSecurityComponent } from '../account-security/account-security.component';
import { AdminMembersComponent } from '../admin-members/admin-members.component';
import { AdminCharactersComponent } from '../admin-characters/admin-characters.component';
import { PictureSettingsComponent } from '../picture-settings/picture-settings.component';

// The settings: the profile (picture, name, bio) and the colour mode, then
// the account's email, password and sign-ins in their own section.
@Component({
  selector: 'cdt-settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  imports: [
    AccountSecurityComponent,
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnDestroy {
  protected readonly authStore = inject(AuthStore);
  private readonly settingsStore = inject(SettingsStore);

  private readonly settings = signal({
    username: '',
    bio: '',
    darkMode: this.settingsStore.darkMode(),
  });
  protected readonly form = form(
    this.settings,
    (path) => {
      required(path.username);
    },
    { submission: { action: async () => this.save() } },
  );

  readonly setUserDataToForm = effect(() => {
    const userLoaded = this.authStore.getUserLoaded();
    if (userLoaded) {
      const { username, bio, darkMode } = this.authStore.user();
      this.settings.update((settings) => ({
        username,
        bio: bio ?? '',
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
    const { username, bio, darkMode } = this.settings();
    const chosen = this.authStore.user().darkMode !== undefined || this.form.darkMode().dirty();
    this.authStore.updateUser({ username, bio, ...(chosen ? { darkMode } : {}) });
  }
}
