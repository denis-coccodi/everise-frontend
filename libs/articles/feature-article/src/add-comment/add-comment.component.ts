import { Article, User } from '@everise/core/api-types';
import { InputErrorsComponent, ListErrorsComponent } from '@everise/core/forms';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormField, FormRoot, form } from '@angular/forms/signals';
import { AttachmentsEditorComponent } from '@everise/media';
import { NewComment } from '@everise/articles/data-access';
import { NewAttachment } from '@everise/core/api-types';
import {
  AvatarComponent,
  ButtonComponent,
  CardComponent,
  FieldComponent,
  InputComponent,
} from '@everise/ui/components';

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
    FormField,
    FormRoot,
    InputErrorsComponent,
    AttachmentsEditorComponent,
    AvatarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddCommentComponent {
  article = input.required<Article>();
  currentUser = input.required<User>();
  submitComment = output<NewComment>();
  // An image, GIF or video to go with the comment.
  protected readonly attachments = signal<NewAttachment[]>([]);

  private readonly comment = signal({ comment: '' });
  protected readonly form = form(this.comment, { submission: { action: async () => this.submit() } });

  // Posts the comment and empties the box for the next one. Text, an
  // attachment, or both.
  private submit() {
    const body = this.comment().comment;
    if (!body.trim() && this.attachments().length === 0) return;
    this.submitComment.emit({ body, media: this.attachments() });
    this.form().reset({ comment: '' });
    this.attachments.set([]);
  }
}
