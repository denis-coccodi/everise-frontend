import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TataruProfile } from '@realworld/core/api-types';
import { AdminService, adminErrorMessage } from '@realworld/settings/data-access';
import { ButtonComponent, FieldComponent, InputComponent, PanelComponent } from '@realworld/ui/components';
import { PictureCropDialogComponent } from '../picture-crop-dialog/picture-crop-dialog.component';
import { PICTURE_HINT, checkChosenFile } from '../profile-picture';

// For admins: Tataru, the account that posts guests' roulette results. Nobody
// signs in as her; her picture and bio are edited here, the picture with the
// same crop window as anyone's.
@Component({
  selector: 'cdt-admin-tataru',
  templateUrl: './admin-tataru.component.html',
  styleUrl: './admin-tataru.component.scss',
  imports: [
    ButtonComponent,
    FieldComponent,
    InputComponent,
    PanelComponent,
    PictureCropDialogComponent,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTataruComponent {
  private readonly admin = inject(AdminService);

  protected readonly pictureHint = PICTURE_HINT;
  protected readonly tataru = signal<TataruProfile | null>(null);
  protected readonly form = new FormGroup({ bio: new FormControl('', { nonNullable: true }) });
  protected readonly busy = signal(false);
  protected readonly status = signal('');
  protected readonly error = signal<string | null>(null);
  // The picture being cropped in the dialog.
  protected readonly cropping = signal<File | null>(null);
  // The element, not the cdtButton component on it.
  private readonly chooseButton = viewChild('chooseButton', { read: ElementRef<HTMLButtonElement> });

  constructor() {
    this.admin.tataru().subscribe({
      next: ({ tataru }) => this.show(tataru),
      error: (response: HttpErrorResponse) => this.error.set(adminErrorMessage(response)),
    });
  }

  protected saveBio() {
    this.run(this.admin.updateTataru(this.form.controls.bio.value), 'Her bio is saved.');
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
    this.run(this.admin.uploadTataruPicture(picture), 'Her new picture is saved.');
  }

  protected closeCropDialog() {
    this.cropping.set(null);
    this.chooseButton()?.nativeElement.focus();
  }

  private run(request: ReturnType<AdminService['tataru']>, done: string) {
    this.busy.set(true);
    this.status.set('');
    this.error.set(null);
    request.subscribe({
      next: ({ tataru }) => {
        this.show(tataru);
        this.busy.set(false);
        this.status.set(done);
      },
      error: (response: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(adminErrorMessage(response));
      },
    });
  }

  private show(tataru: TataruProfile) {
    this.tataru.set(tataru);
    this.form.controls.bio.setValue(tataru.bio ?? '');
  }
}
