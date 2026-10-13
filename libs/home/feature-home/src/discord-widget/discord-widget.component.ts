import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DiscordWidgetResponse } from '@everise/core/api-types';
import { ApiService } from '@everise/core/http-client';
import { AvatarComponent, ButtonComponent, EVERISE_DISCORD } from '@everise/ui/components';
import { EMPTY, catchError, interval, map, startWith, switchMap } from 'rxjs';

const STATUS_NAMES: Record<string, string> = { online: 'online', idle: 'away', dnd: 'do not disturb' };

// Asked again this often while the page is open (the backend reads Discord
// at most once a minute).
const REFRESH_MS = 60 * 1000;

// On the home page, for signed-in members only (the API answers guests with
// 401): who's on the EVERISE Discord server right now, and a way in, in its
// own box. Shown only when there's a widget to show: none while the server's
// widget is off or until a first answer; a request that fails keeps what's
// shown.
@Component({
  selector: 'cdt-discord-widget',
  templateUrl: './discord-widget.component.html',
  styleUrl: './discord-widget.component.scss',
  imports: [ButtonComponent, AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscordWidgetComponent {
  protected readonly invite = EVERISE_DISCORD;

  private readonly api = inject(ApiService);

  protected readonly widget = toSignal(
    interval(REFRESH_MS).pipe(
      startWith(0),
      switchMap(() =>
        this.api.get<DiscordWidgetResponse>('/discord/widget').pipe(
          map(({ widget }) => widget),
          catchError(() => EMPTY),
        ),
      ),
    ),
    { initialValue: null },
  );

  protected statusName(status: string) {
    return STATUS_NAMES[status] ?? status;
  }
}
