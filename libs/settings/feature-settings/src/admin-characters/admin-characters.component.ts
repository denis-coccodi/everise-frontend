import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CharacterChanges } from '@everise/core/api-types';
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
import { PICTURE_HINT, checkChosenFile } from '../profile-picture';

// For admins: the Waking Sands characters, a tab each (AdminCharactersStore).
// Each has a picture (the same crop window as anyone's), a title and a
// personality, the description the AI plays them from, which can go back to
// the original. Tataru's tab also has her bio: she is the account that posts
// guests' roulette results too.
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
    ReactiveFormsModule,
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
  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true }),
    persona: new FormControl('', { nonNullable: true }),
    bio: new FormControl('', { nonNullable: true }),
  });
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
        this.form.setValue({ title: character.title, persona: character.persona, bio: character.bio ?? '' });
      }
    });
  }

  protected save() {
    const { title, persona, bio } = this.form.getRawValue();
    const changes: CharacterChanges = { title, persona };
    if (this.store.selected()?.bio !== undefined) changes.bio = bio;
    this.store.save(changes);
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

  protected closeCropDialog() {
    this.cropping.set(null);
    this.chooseButton()?.nativeElement.focus();
  }
}
