import { Article, User } from '@realworld/core/api-types';
import { InputErrorsComponent, ListErrorsComponent } from '@realworld/core/forms';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MediaToolsComponent } from '@realworld/media';
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
    MediaToolsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddCommentComponent {
  private readonly fb = inject(FormBuilder);

  article = input.required<Article>();
  currentUser = input.required<User>();
  submitComment = output<string>();

  form = this.fb.nonNullable.group({
    comment: [''],
  });

  // Posts the comment and empties the box for the next one.
  protected submit() {
    this.submitComment.emit(this.form.controls.comment.value);
    this.form.reset();
  }
}
