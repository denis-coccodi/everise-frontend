import { Article, User } from '@realworld/core/api-types';
import { InputErrorsComponent, ListErrorsComponent } from '@realworld/core/forms';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AttachmentsEditorComponent } from '@realworld/media';
import { NewComment } from '@realworld/articles/data-access';
import { NewAttachment } from '@realworld/core/api-types';
import { ButtonComponent, CardComponent, FieldComponent, InputComponent } from '@realworld/ui/components';

@Component({
  selector: 'cdt-add-comment',
  templateUrl: './add-comment.component.html',
  styleUrl: './add-comment.component.scss',
  imports: [
    ButtonComponent,
    CardComponent,
    FieldComponent,
    InputComponent,
    ListErrorsComponent,
    ReactiveFormsModule,
    InputErrorsComponent,
    AttachmentsEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddCommentComponent {
  private readonly fb = inject(FormBuilder);

  article = input.required<Article>();
  currentUser = input.required<User>();
  submitComment = output<NewComment>();
  // An image, GIF or video to go with the comment.
  protected readonly attachments = signal<NewAttachment[]>([]);

  form = this.fb.nonNullable.group({
    comment: [''],
  });

  // Posts the comment and empties the box for the next one. Text, an
  // attachment, or both.
  protected submit() {
    const body = this.form.controls.comment.value;
    if (!body.trim() && this.attachments().length === 0) return;
    this.submitComment.emit({ body, media: this.attachments() });
    this.form.reset();
    this.attachments.set([]);
  }
}
