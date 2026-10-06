import { InputErrorsComponent, ListErrorsComponent } from '@realworld/core/forms';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ArticleStore } from '@realworld/articles/data-access';
import { AttachmentsEditorComponent } from '@realworld/media';
import { Attachment, MAX_POST_ATTACHMENTS, NewAttachment } from '@realworld/core/api-types';
import { ButtonComponent, FieldComponent, InputComponent } from '@realworld/ui/components';

@Component({
  selector: 'cdt-article-edit',
  templateUrl: './article-edit.component.html',
  styleUrl: './article-edit.component.scss',
  imports: [
    AttachmentsEditorComponent,
    FieldComponent,
    ButtonComponent,
    InputComponent,
    ListErrorsComponent,
    ReactiveFormsModule,
    InputErrorsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleEditComponent implements OnDestroy {
  private readonly articleStore = inject(ArticleStore);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute).snapshot;

  // /editor/:articleId edits an article; /editor writes a new one.
  protected readonly editing = () =>
    this.route.paramMap.has('articleId') || !!this.route.firstChild?.paramMap.has('articleId');

  // Up to 4 images, GIFs and videos, shown apart from the text.
  protected readonly attachments = signal<NewAttachment[]>([]);
  protected readonly maxAttachments = MAX_POST_ATTACHMENTS;

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    description: ['', [Validators.required]],
    // May be empty when the post has attachments.
    body: [''],
    tagList: [''],
  });

  readonly setArticleDataToForm = effect(() => {
    const articleLoaded = this.articleStore.getArticleLoaded();
    if (articleLoaded) {
      this.form.patchValue({
        title: this.articleStore.data.title(),
        description: this.articleStore.data.description(),
        body: this.articleStore.data.body(),
        tagList: this.articleStore.data.tagList().join(', '),
      });
      this.attachments.set(this.articleStore.data.media().map(toNew));
    }
  });

  onSubmit() {
    const article = {
      // Tags are typed comma-separated; no tags (or stray commas) send none.
      article: {
        ...this.form.getRawValue(),
        tagList: this.form.controls.tagList.value
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        media: this.attachments(),
      },
    };
    if (this.articleStore.data.id()) {
      this.articleStore.editArticle({ editArticle: article, articleId: this.articleStore.data.id() });
    } else {
      this.articleStore.publishArticle(article);
    }
  }

  ngOnDestroy() {
    this.form.reset();
  }
}

// An attachment as the editor sends it back.
function toNew(attachment: Attachment): NewAttachment {
  const { kind, url, alt } = attachment;
  return attachment.kind === 'video'
    ? { kind, url, alt }
    : { kind, url, alt, width: attachment.width, height: attachment.height };
}
