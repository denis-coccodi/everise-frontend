import { Component, ChangeDetectionStrategy, output, input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Article } from '@everise/core/api-types';
import { API_URL, gameImageUrl } from '@everise/core/http-client';
import {
  ButtonComponent,
  BylineComponent,
  DutyCardComponent,
  IconComponent,
  TagComponent,
} from '@everise/ui/components';
import { MediaGridComponent } from '@everise/media';
@Component({
  selector: 'cdt-article-list-item',
  templateUrl: './article-list-item.component.html',
  styleUrl: './article-list-item.component.scss',
  imports: [
    MediaGridComponent,
    BylineComponent,
    ButtonComponent,
    DutyCardComponent,
    TagComponent,
    RouterModule,
    IconComponent,
  ],
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
      this.unFavorite.emit(article.id);
    } else {
      this.favorite.emit(article.id);
    }
  }
}
