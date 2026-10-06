import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { Article, User } from '@realworld/core/api-types';
import { Comment } from '@realworld/articles/data-access';
import { RichTextComponent } from '@realworld/media';
import { BylineComponent, CardComponent } from '@realworld/ui/components';

@Component({
  selector: 'cdt-article-comment',
  templateUrl: './article-comment.component.html',
  styleUrl: './article-comment.component.scss',
  imports: [BylineComponent, CardComponent, RichTextComponent],
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
}
