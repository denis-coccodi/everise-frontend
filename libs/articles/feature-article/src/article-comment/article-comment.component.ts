import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';
import { Article, User } from '@realworld/core/api-types';
import { Comment } from '@realworld/articles/data-access';
import { MediaGridComponent, RichTextComponent } from '@realworld/media';
import { BylineComponent, CardComponent } from '@realworld/ui/components';

@Component({
  selector: 'cdt-article-comment',
  templateUrl: './article-comment.component.html',
  styleUrl: './article-comment.component.scss',
  imports: [MediaGridComponent, BylineComponent, CardComponent, RichTextComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleCommentComponent {
  currentUser = input.required<User>();
  comment = input.required<Comment>();
  article = input.required<Article>();
  delete = output<{
    commentId: string;
    articleId: string;
  }>();

  // The comment's attachment, as a grid of one.
  protected readonly media = computed(() => {
    const media = this.comment().media;
    return media ? [media] : [];
  });
}
