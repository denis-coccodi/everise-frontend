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
import { PfListingComponent } from '@everise/party-finder/feature-pf-listing';
import { SharePostDiscordComponent } from '../share-post-discord/share-post-discord.component';
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
    PfListingComponent,
    SharePostDiscordComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleListItemComponent {
  article = input.required<Article>();
  favorite = output<string>();
  unFavorite = output<string>();
  // Whether the viewer may follow the author (signed in, someone else, a
  // member): Follow / Unfollow next to their name.
  canFollow = input(false);
  follow = output<string>();
  unfollow = output<string>();

  private readonly apiUrl = inject(API_URL);
  // A shared listing's time left, from when the feed showed it.
  protected readonly now = Date.now();

  // A roulette card's game image.
  protected imageUrl(id: number | null | undefined) {
    return gameImageUrl(this.apiUrl, id);
  }

  toggleFollow(article: Article) {
    if (article.author.following) {
      this.unfollow.emit(article.author.id);
    } else {
      this.follow.emit(article.author.id);
    }
  }

  toggleFavorite(article: Article) {
    if (article.favorited) {
      this.unFavorite.emit(article.id);
    } else {
      this.favorite.emit(article.id);
    }
  }
}
