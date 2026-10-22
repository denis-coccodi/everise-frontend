import { HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { NotificationsResponse, UnseenNotificationsResponse } from '@everise/core/api-types';
import { SKIP_LOGIN_REDIRECT } from '@everise/core/error-handler';
import { ApiService } from '@everise/core/http-client';

@Service()
export class NotificationsService {
  private readonly api = inject(ApiService);

  // How many are new, asked for in the background: a session that ran out
  // meanwhile isn't a reason to leave the page.
  unseen() {
    return this.api.get<UnseenNotificationsResponse>(
      '/notifications/unseen',
      undefined,
      new HttpContext().set(SKIP_LOGIN_REDIRECT, true),
    );
  }

  // The list was opened: none are new any more. Answers the list.
  markSeen() {
    return this.api.post<NotificationsResponse, void>('/notifications/seen');
  }

  markRead(id: string) {
    return this.api.post<NotificationsResponse, void>(`/notifications/${encodeURIComponent(id)}/read`);
  }

  markAllRead() {
    return this.api.post<NotificationsResponse, void>('/notifications/read');
  }
}
