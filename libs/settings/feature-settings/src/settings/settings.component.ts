import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, FormRoot, email, form, minLength, required } from '@angular/forms/signals';
import { AuthStore } from '@everise/auth/data-access';
import { InputErrorsComponent, ListErrorsComponent } from '@everise/core/forms';
import { SettingsStore } from '@everise/settings/data-access';
import {
  AvatarComponent,
  ButtonComponent,
  FieldComponent,
  InputComponent,
  SwitchComponent,
} from '@everise/ui/components';
import { AdminMembersComponent } from '../admin-members/admin-members.component';
import { AdminCharactersComponent } from '../admin-characters/admin-characters.component';
import { PictureCropDialogComponent } from '../picture-crop-dialog/picture-crop-dialog.component';
import { PICTURE_HINT, checkChosenFile } from '../profile-picture/profile-picture';
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
    PictureCropDialogComponent,
    SignInMethodsComponent,
    AvatarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnDestroy {
  protected readonly authStore = inject(AuthStore);
  private readonly settingsStore = inject(SettingsStore);

  protected readonly pictureHint = PICTURE_HINT;
  // The picture being cropped in the dialog.
  protected readonly cropping = signal<File | null>(null);
  // The element, not the cdtButton component on it.
  private readonly chooseButton = viewChild('chooseButton', { read: ElementRef<HTMLButtonElement> });
  // An uploaded picture can be removed; the default one can't.
  protected readonly hasOwnPicture = computed(() => this.authStore.user().image.includes('/api/profile-images/'));

  // The password is only changed when a new one is typed.
  private readonly settings = signal({
    username: '',
    bio: '',
    email: '',
    password: '',
    darkMode: this.settingsStore.darkMode(),
  });
  protected readonly form = form(
    this.settings,
    (path) => {
      required(path.username);
      required(path.email);
      email(path.email);
      minLength(path.password, 8);
    },
    { submission: { action: async () => this.save() } },
  );

  constructor() {
    // A problem from an earlier visit is old news.
    this.authStore.setImageError(null);
  }

  readonly setUserDataToForm = effect(() => {
    const userLoaded = this.authStore.getUserLoaded();
    if (userLoaded) {
      const { username, bio, email, darkMode } = this.authStore.user();
      this.settings.update((settings) => ({
        username,
        bio: bio ?? '',
        email,
        password: '',
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

  private save() {
    const { password, ...fields } = this.settings();
    this.authStore.updateUser({ ...fields, ...(password ? { password } : {}) });
  }

  // A file chosen in the browser's file window: checked, then cropped in the
  // dialog.
  onPictureChosen(input: HTMLInputElement) {
    const file = input.files?.[0];
    // Lets the same file be chosen again.
    input.value = '';
    if (!file) return;

    const problem = checkChosenFile(file);
    this.authStore.setImageError(problem);
    if (!problem) {
      this.cropping.set(file);
    }
  }

  // The cropped picture, ready to store.
  onCropped(picture: Blob) {
    this.closeCropDialog();
    this.authStore.uploadImage(picture);
  }

  closeCropDialog() {
    this.cropping.set(null);
    this.chooseButton()?.nativeElement.focus();
  }

  removePicture() {
    this.authStore.removeImage();
  }
}
