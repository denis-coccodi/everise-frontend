import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { FormField, FormRoot, form, maxLength } from '@angular/forms/signals';
import { AdminCharactersStore } from '@everise/settings/data-access';
import {
  AvatarComponent,
  ButtonComponent,
  FieldComponent,
  InputComponent,
  MessageComponent,
  PanelComponent,
  TabComponent,
  TabsComponent,
} from '@everise/ui/components';
import { PictureCropDialogComponent } from '../picture-crop-dialog/picture-crop-dialog.component';
import { PICTURE_HINT, checkChosenFile } from '../profile-picture/profile-picture';

// For admins: the Waking Sands characters, a tab each (AdminCharactersStore).
// Each has a picture (the same crop window as anyone's, or back to their
// default portrait), a title and a
// personality, the description the AI plays them from, which can go back to
// the original, and their profile's bio. Tataru's also show on the roulette
// results she posts for guests.
@Component({
  selector: 'cdt-admin-characters',
  templateUrl: './admin-characters.component.html',
  styleUrl: './admin-characters.component.scss',
  imports: [
    ButtonComponent,
    FieldComponent,
    InputComponent,
    PanelComponent,
    PictureCropDialogComponent,
    FormField,
    FormRoot,
    TabComponent,
    TabsComponent,
    AvatarComponent,
    MessageComponent,
  ],
  providers: [AdminCharactersStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCharactersComponent {
  protected readonly store = inject(AdminCharactersStore);

  protected readonly pictureHint = PICTURE_HINT;
  private readonly changes = signal({ title: '', persona: '', bio: '' });
  // The lengths come from the backend's answer, and set each box's maxlength.
  protected readonly form = form(
    this.changes,
    (path) => {
      maxLength(path.title, () => this.store.limits()?.title);
      maxLength(path.persona, () => this.store.limits()?.persona);
      maxLength(path.bio, () => this.store.limits()?.bio);
    },
    { submission: { action: async () => this.store.save(this.changes()) } },
  );
  // The picture being cropped in the dialog.
  protected readonly cropping = signal<File | null>(null);
  // The element, not the cdtButton component on it.
  private readonly chooseButton = viewChild('chooseButton', { read: ElementRef<HTMLButtonElement> });

  constructor() {
    // The form shows the open character as saved: on opening a tab, and
    // after each save.
    effect(() => {
      const character = this.store.selected();
      if (character) {
        this.changes.set({ title: character.title, persona: character.persona, bio: character.bio });
      }
    });
  }

  // A file chosen in the browser's file window: checked, then cropped.
  protected onPictureChosen(input: HTMLInputElement) {
    const file = input.files?.[0];
    // Lets the same file be chosen again.
    input.value = '';
    if (!file) return;
    const problem = checkChosenFile(file);
    this.store.setError(problem);
    if (!problem) {
      this.cropping.set(file);
    }
  }

  protected onCropped(picture: Blob) {
    this.closeCropDialog();
    this.store.uploadPicture(picture);
  }

  // The button goes once it's done: the focus waits on "Change the picture".
  protected useDefaultPicture() {
    this.chooseButton()?.nativeElement.focus();
    this.store.resetPicture();
  }

  protected closeCropDialog() {
    this.cropping.set(null);
    this.chooseButton()?.nativeElement.focus();
  }
}
