import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RelayEmbed } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { MediaGridComponent } from '@everise/media';
import { DiscordTextComponent } from '../discord-text/discord-text.component';
import { discordTime } from '../discord-times';
import { embedColour, embedPicture, pictureUrl } from '../relay-pictures';

// A bot's card in a Discord message, as Discord shows it: its edge in the
// bot's colour, author, title (a link when it has one), text, fields (side
// by side when inline), a large picture, a small one in the corner, and a
// footer with its time.
@Component({
  selector: 'cdt-discord-embed',
  templateUrl: './discord-embed.component.html',
  styleUrl: './discord-embed.component.scss',
  imports: [DiscordTextComponent, MediaGridComponent],
  // The bot's own colour comes with the message, so it can't be a theme
  // token: it only colours the card's edge, never text.
  host: { '[style.--embed-edge]': 'colour()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscordEmbedComponent {
  readonly embed = input.required<RelayEmbed>();
  readonly now = input(Date.now());

  private readonly apiUrl = inject(API_URL);

  protected readonly colour = computed(() => embedColour(this.embed()));
  protected readonly picture = computed(() => embedPicture(this.apiUrl, this.embed()));
  protected readonly thumbnail = computed(() => {
    const thumbnail = this.embed().thumbnail;
    return thumbnail ? pictureUrl(this.apiUrl, thumbnail) : null;
  });
  // Discord uses fields with no name and no text, and fields named ".", to
  // lay the others out: the first as a row break, the name not shown.
  protected readonly fields = computed(() =>
    this.embed().fields.map((field) => ({
      ...field,
      name: field.name.trim() === '.' ? '' : field.name,
      spacer: !field.name.trim() && !field.value.trim(),
    })),
  );
  protected readonly footerTime = computed(() => {
    const timestamp = this.embed().timestamp;
    return timestamp ? discordTime(Date.parse(timestamp), 'f', this.now()) : null;
  });
}
