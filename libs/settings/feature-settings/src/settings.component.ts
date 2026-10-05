import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStore } from '@realworld/auth/data-access';
import { User } from '@realworld/core/api-types';
import { InputErrorsComponent, ListErrorsComponent } from '@realworld/core/forms';
import { SettingsStore } from '@realworld/settings/data-access';
import { ButtonComponent, CheckboxComponent, FieldComponent, InputComponent } from '@realworld/ui/components';
import { PictureCropDialogComponent } from './picture-crop-dialog/picture-crop-dialog.component';
import { PICTURE_HINT, checkChosenFile } from './profile-picture';

@Component({
  selector: 'cdt-settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  imports: [
    FieldComponent,
    ButtonComponent,
    CheckboxComponent,
    InputComponent,
    ListErrorsComponent,
    ReactiveFormsModule,
    InputErrorsComponent,
    PictureCropDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  protected readonly authStore = inject(AuthStore);
  private readonly settingsStore = inject(SettingsStore);
  private readonly fb = inject(FormBuilder);

  protected readonly pictureHint = PICTURE_HINT;
  // The picture being cropped in the dialog.
  protected readonly cropping = signal<File | null>(null);
  // The element, not the cdtButton component on it.
  private readonly chooseButton = viewChild('chooseButton', { read: ElementRef<HTMLButtonElement> });
  // An uploaded picture can be removed; the default one can't.
  protected readonly hasOwnPicture = computed(() => this.authStore.user().image.includes('/api/profile-images/'));

  // The password is only changed when a new one is typed.
  form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    bio: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(8)]],
  });

  darkMode = this.settingsStore.darkMode();

  constructor() {
    // A problem from an earlier visit is old news.
    this.authStore.setImageError(null);
  }

  readonly setUserDataToForm = effect(() => {
    const userLoaded = this.authStore.getUserLoaded();
    if (userLoaded) {
      this.form.patchValue({ ...this.authStore.user(), password: '' });
    }
  });

  toggleDarkMode() {
    this.settingsStore.toggleDarkModeStatus();
  }

  onSubmit() {
    const { password, ...fields } = this.form.getRawValue();
    this.authStore.updateUser({ ...fields, ...(password ? { password } : {}) } as User);
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
