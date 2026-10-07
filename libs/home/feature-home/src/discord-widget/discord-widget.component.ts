import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DiscordWidgetResponse } from '@everise/core/api-types';
import { ApiService } from '@everise/core/http-client';
import { AvatarComponent, ButtonComponent, EVERISE_DISCORD } from '@everise/ui/components';
import { catchError, map, of } from 'rxjs';

const STATUS_NAMES: Record<string, string> = { online: 'online', idle: 'away', dnd: 'do not disturb' };

// On the home page, for signed-in members only (the API answers guests with
// 401): who's on the EVERISE Discord server right now, and a way in. Shown
// only when the server's widget is turned on.
@Component({
  selector: 'cdt-discord-widget',
  templateUrl: './discord-widget.component.html',
  styleUrl: './discord-widget.component.scss',
  imports: [ButtonComponent, AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscordWidgetComponent {
  protected readonly invite = EVERISE_DISCORD;

  protected readonly widget = toSignal(
    inject(ApiService)
      .get<DiscordWidgetResponse>('/discord/widget')
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
