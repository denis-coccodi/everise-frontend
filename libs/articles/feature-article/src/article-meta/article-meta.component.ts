import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Article } from '@everise/core/api-types';
import { ButtonComponent, BylineComponent, IconComponent } from '@everise/ui/components';
@Component({
  selector: 'cdt-article-meta',
  templateUrl: './article-meta.component.html',
  styleUrl: './article-meta.component.scss',
  imports: [BylineComponent, ButtonComponent, RouterModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleMetaComponent {
  article = input.required<Article>();
  canModify = input.required<boolean>();
  follow = output<string>();
  unfollow = output<string>();
  unfavorite = output<string>();
  favorite = output<string>();
  delete = output<string>();

  toggleFavorite() {
    if (this.article().favorited) {
      this.unfavorite.emit(this.article().id);
    } else {
      this.favorite.emit(this.article().id);
    }
  }

  toggleFollow() {
    if (this.article().author.following) {
      this.unfollow.emit(this.article().author.id);
    } else {
      this.follow.emit(this.article().author.id);
    }
  }

  deleteArticle() {
    this.delete.emit(this.article().id);
  }
}
