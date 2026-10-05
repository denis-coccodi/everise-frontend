import { Component, ChangeDetectionStrategy, output, input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Article } from '@realworld/core/api-types';
import { API_URL, gameImageUrl } from '@realworld/core/http-client';
import { BylineComponent, ButtonComponent, DutyCardComponent, TagComponent } from '@realworld/ui/components';
@Component({
  selector: 'cdt-article-list-item',
  templateUrl: './article-list-item.component.html',
  styleUrl: './article-list-item.component.scss',
  imports: [BylineComponent, ButtonComponent, DutyCardComponent, TagComponent, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleListItemComponent {
  article = input.required<Article>();
  favorite = output<string>();
  unFavorite = output<string>();

  private readonly apiUrl = inject(API_URL);

  // A roulette card's game image.
  protected imageUrl(id: number | null | undefined) {
    return gameImageUrl(this.apiUrl, id);
  }

  toggleFavorite(article: Article) {
    if (article.favorited) {
      this.unFavorite.emit(article.slug);
    } else {
      this.favorite.emit(article.slug);
    }
  }
}
