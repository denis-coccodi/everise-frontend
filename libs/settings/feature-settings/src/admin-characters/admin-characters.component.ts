import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CHARACTER_LIMITS, CharacterChanges, CharacterResponse, CharacterSettings } from '@realworld/core/api-types';
import { serverMessage } from '@realworld/core/forms';
import { AdminService } from '@realworld/settings/data-access';
import {
  ButtonComponent,
  FieldComponent,
  InputComponent,
  PanelComponent,
  TabComponent,
  TabsComponent,
} from '@realworld/ui/components';
import { Observable } from 'rxjs';
import { PictureCropDialogComponent } from '../picture-crop-dialog/picture-crop-dialog.component';
import { PICTURE_HINT, checkChosenFile } from '../profile-picture';

// For admins: the Waking Sands characters, a tab each. Each has a picture
// (the same crop window as anyone's), a title and a personality, the
// description the AI plays them from, which can go back to the original.
// Tataru's tab also has her bio: she is the account that posts guests'
// roulette results too.
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCharactersComponent {
  private readonly admin = inject(AdminService);

  protected readonly pictureHint = PICTURE_HINT;
  protected readonly limits = CHARACTER_LIMITS;
  protected readonly characters = signal<CharacterSettings[] | null>(null);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(
    () => this.characters()?.find((character) => character.id === this.selectedId()) ?? null,
  );
  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true }),
    persona: new FormControl('', { nonNullable: true }),
    bio: new FormControl('', { nonNullable: true }),
  });
  protected readonly busy = signal(false);
  protected readonly status = signal('');
  protected readonly error = signal<string | null>(null);
  // The picture being cropped in the dialog.
  protected readonly cropping = signal<File | null>(null);
  // The element, not the cdtButton component on it.
  private readonly chooseButton = viewChild('chooseButton', { read: ElementRef<HTMLButtonElement> });

  constructor() {
    this.admin.characters().subscribe({
      next: ({ characters }) => {
        this.characters.set(characters);
        if (characters.length) this.select(characters[0].id);
      },
      error: (response: HttpErrorResponse) => this.error.set(serverMessage(response)),
    });
  }

  // The first word of a long name is enough on a tab ("Barnaby").
  protected tabName(character: CharacterSettings) {
    return character.name.split(' ')[0];
  }

  protected select(id: string) {
    this.selectedId.set(id);
    this.status.set('');
    this.error.set(null);
    const character = this.selected();
    if (character) this.fill(character);
  }

  protected save() {
    const character = this.selected();
    if (!character) return;
    const { title, persona, bio } = this.form.getRawValue();
    const changes: CharacterChanges = { title, persona };
    if (character.bio !== undefined) changes.bio = bio;
    this.run(this.admin.updateCharacter(character.id, changes), `${this.tabName(character)}'s changes are saved.`);
  }

  // Back to the personality the site ships with.
  protected restorePersona() {
    const character = this.selected();
    if (!character) return;
    this.run(
      this.admin.updateCharacter(character.id, { persona: '' }),
      `${this.tabName(character)}'s original personality is back.`,
    );
  }

  // A file chosen in the browser's file window: checked, then cropped.
  protected onPictureChosen(input: HTMLInputElement) {
    const file = input.files?.[0];
    // Lets the same file be chosen again.
    input.value = '';
    if (!file) return;
    const problem = checkChosenFile(file);
    this.error.set(problem);
    if (!problem) {
      this.cropping.set(file);
    }
  }

  protected onCropped(picture: Blob) {
    this.closeCropDialog();
    const character = this.selected();
    if (!character) return;
    this.run(
      this.admin.uploadCharacterPicture(character.id, picture),
      `${this.tabName(character)}'s new picture is saved.`,
    );
  }

  protected closeCropDialog() {
    this.cropping.set(null);
    this.chooseButton()?.nativeElement.focus();
  }

  private run(request: Observable<CharacterResponse>, done: string) {
    this.busy.set(true);
    this.status.set('');
    this.error.set(null);
    request.subscribe({
      next: ({ character }) => {
        this.characters.update((all) => all?.map((c) => (c.id === character.id ? character : c)) ?? null);
        if (character.id === this.selectedId()) this.fill(character);
        this.busy.set(false);
        this.status.set(done);
      },
      error: (response: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(serverMessage(response));
      },
    });
  }

  private fill(character: CharacterSettings) {
    this.form.setValue({
      title: character.title,
      persona: character.persona,
      bio: character.bio ?? '',
    });
  }
}
