import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { AuthStore } from '@everise/auth/data-access';
import { AvatarComponent, ButtonComponent } from '@everise/ui/components';
import { PictureCropDialogComponent } from '../picture-crop-dialog/picture-crop-dialog.component';
import { PICTURE_HINT, checkChosenFile } from '../profile-picture/profile-picture';

// In the settings: the profile picture, chosen, cropped and uploaded right
// away (not with the form's "Update Settings").
@Component({
  selector: 'cdt-picture-settings',
  templateUrl: './picture-settings.component.html',
  styleUrl: './picture-settings.component.scss',
  imports: [AvatarComponent, ButtonComponent, PictureCropDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PictureSettingsComponent {
  protected readonly authStore = inject(AuthStore);

  protected readonly pictureHint = PICTURE_HINT;
  // The picture being cropped in the dialog.
  protected readonly cropping = signal<File | null>(null);
  // The element, not the cdtButton component on it.
  private readonly chooseButton = viewChild('chooseButton', { read: ElementRef<HTMLButtonElement> });
  // An uploaded picture can be removed; the default one can't.
  protected readonly hasOwnPicture = computed(() => this.authStore.user().image.includes('/api/profile-images/'));

  constructor() {
    // A problem from an earlier visit is old news.
    this.authStore.setImageError(null);
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
