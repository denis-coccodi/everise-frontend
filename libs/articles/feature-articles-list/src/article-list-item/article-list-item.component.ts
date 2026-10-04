import { Component, ChangeDetectionStrategy, output, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Article } from '@realworld/core/api-types';
import { BylineComponent, ButtonComponent, TagComponent } from '@realworld/ui/components';
@Component({
  selector: 'cdt-article-list-item',
  templateUrl: './article-list-item.component.html',
  styleUrl: './article-list-item.component.scss',
  imports: [BylineComponent, ButtonComponent, TagComponent, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleListItemComponent {
  article = input.required<Article>();
  favorite = output<string>();
  unFavorite = output<string>();
  navigateToArticle = output<string>();

  toggleFavorite(article: Article) {
    if (article.favorited) {
      this.unFavorite.emit(article.slug);
    } else {
      this.favorite.emit(article.slug);
    }
  }
}
