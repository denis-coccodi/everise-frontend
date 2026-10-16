import { InputErrorsComponent, ListErrorsComponent } from '@everise/core/forms';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import { ActivatedRoute } from '@angular/router';
import { ArticleStore, DiscordSharingService } from '@everise/articles/data-access';
import { AttachmentsEditorComponent } from '@everise/media';
import { Attachment, MAX_POST_ATTACHMENTS, NewAttachment } from '@everise/core/api-types';
import { ButtonComponent, CheckboxComponent, FieldComponent, InputComponent } from '@everise/ui/components';

@Component({
  selector: 'cdt-article-edit',
  templateUrl: './article-edit.component.html',
  styleUrl: './article-edit.component.scss',
  imports: [
    AttachmentsEditorComponent,
    CheckboxComponent,
    FieldComponent,
    ButtonComponent,
    InputComponent,
    ListErrorsComponent,
    FormField,
    FormRoot,
    InputErrorsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleEditComponent {
  private readonly articleStore = inject(ArticleStore);
  private readonly route = inject(ActivatedRoute).snapshot;

  // /editor/:articleId edits an article; /editor writes a new one.
  protected readonly editing = () =>
    this.route.paramMap.has('articleId') || !!this.route.firstChild?.paramMap.has('articleId');

  // Up to 4 images, GIFs and videos, shown apart from the text.
  protected readonly attachments = signal<NewAttachment[]>([]);
  protected readonly maxAttachments = MAX_POST_ATTACHMENTS;
  // A new post goes to the Everise Discord too only when ticked.
  protected readonly discordAvailable = inject(DiscordSharingService).available;
  protected readonly shareToDiscord = signal(false);

  // The body may be empty when the post has attachments.
  private readonly article = signal({ title: '', description: '', body: '', tagList: '' });
  protected readonly form = form(
    this.article,
    (path) => {
      required(path.title);
      required(path.description);
    },
    { submission: { action: async () => this.publish() } },
  );

  readonly setArticleDataToForm = effect(() => {
    const articleLoaded = this.articleStore.getArticleLoaded();
    if (articleLoaded) {
      this.article.set({
        title: this.articleStore.data.title(),
        description: this.articleStore.data.description(),
        body: this.articleStore.data.body(),
        tagList: this.articleStore.data.tagList().join(', '),
      });
      this.attachments.set(this.articleStore.data.media().map(toNew));
    }
  });

  private publish() {
    const article = {
      // Tags are typed comma-separated; no tags (or stray commas) send none.
      article: {
        ...this.article(),
        tagList: this.article()
          .tagList.split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        media: this.attachments(),
      },
    };
    if (this.articleStore.data.id()) {
      this.articleStore.editArticle({ editArticle: article, articleId: this.articleStore.data.id() });
    } else {
      this.articleStore.publishArticle({
        ...article,
        ...(this.shareToDiscord() && this.discordAvailable() ? { shareToDiscord: true } : {}),
      });
    }
  }
}

// An attachment as the editor sends it back.
function toNew(attachment: Attachment): NewAttachment {
  const { kind, url, alt } = attachment;
  return attachment.kind === 'video'
    ? { kind, url, alt }
    : { kind, url, alt, width: attachment.width, height: attachment.height };
}
