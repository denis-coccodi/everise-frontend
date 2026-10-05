import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiService } from '@realworld/core/http-client';
import { ButtonComponent, EVERISE_DISCORD } from '@realworld/ui/components';
import { catchError, map, of } from 'rxjs';

// The Discord server's public widget, from GET /api/discord/widget.
export interface DiscordWidget {
  name: string;
  presenceCount: number;
  members: { name: string; avatarUrl: string; status: string }[];
}

const STATUS_NAMES: Record<string, string> = { online: 'online', idle: 'away', dnd: 'do not disturb' };

// On the home page: who's on the EVERISE Discord server right now, and a
// way in. Shown only when the server's widget is turned on.
@Component({
  selector: 'cdt-discord-widget',
  templateUrl: './discord-widget.component.html',
  styleUrl: './discord-widget.component.scss',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscordWidgetComponent {
  protected readonly invite = EVERISE_DISCORD;

  protected readonly widget = toSignal(
    inject(ApiService)
      .get<{ widget: DiscordWidget | null }>('/discord/widget')
      .pipe(
        map(({ widget }) => widget),
        catchError(() => of(null)),
      ),
    { initialValue: null },
  );

  protected statusName(status: string) {
    return STATUS_NAMES[status] ?? status;
  }
}
