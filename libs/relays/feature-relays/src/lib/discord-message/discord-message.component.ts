import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RelayMessage } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { MediaGridComponent } from '@everise/media';
import { DiscordEmbedComponent } from '../discord-embed/discord-embed.component';
import { DiscordTextComponent } from '../discord-text/discord-text.component';
import { discordTime } from '../discord-times';
import { isPictureEmbed, messagePictures } from '../relay-pictures';

// A message relayed from Discord, as Discord shows it: where it came from
// and when, its text, its cards, and its pictures and GIFs (in the media
// grid, which opens them larger and pauses GIFs).
@Component({
  selector: 'cdt-discord-message',
  templateUrl: './discord-message.component.html',
  styleUrl: './discord-message.component.scss',
  imports: [DiscordTextComponent, DiscordEmbedComponent, MediaGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscordMessageComponent {
  readonly message = input.required<RelayMessage>();
  readonly now = input(Date.now());
  // The channel it came from, above the text (the Hunts tab; the Weekly
  // tab names the post itself).
  readonly showSource = input(true);

  private readonly apiUrl = inject(API_URL);

  protected readonly cards = computed(() => this.message().embeds.filter((embed) => !isPictureEmbed(embed)));
  protected readonly pictures = computed(() => messagePictures(this.apiUrl, this.message()));
  protected readonly postedAt = computed(() => discordTime(Date.parse(this.message().postedAt), 'f', this.now()));
}
