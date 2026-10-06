import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, defer, filter, ignoreElements, interval, merge, retry, share, tap, timer } from 'rxjs';
import { WebSocketSubject, WebSocketSubjectConfig, webSocket } from 'rxjs/webSocket';
import { Article } from '@realworld/core/api-types';
import { API_URL } from './api-url.token';

// What the backend pushes on GET /api/live: a new post, as the API shows it
// to someone who isn't signed in (favorited and author.following false).
export type LiveEvent = {
  type: 'article-created';
  article: Article;
};

// Keep-alive: Cloudflare closes WebSockets silent for about 100 seconds, so
// the client says 'ping' now and then; the backend answers 'pong' without
// waking up. Users never see it.
const PING = 'ping';
const PING_EVERY_MS = 25_000;
// Reconnecting: 1 s, then doubling, at most 30 s apart.
const RETRY_FIRST_MS = 1_000;
const RETRY_MAX_MS = 30_000;

// The live updates' WebSocket address, from the API's: "/api" on the site
// gives wss://<site>/api/live, "http://localhost:8080/api" gives
// ws://localhost:8080/api/live.
export function liveUrl(apiUrl: string, page: { href: string } = window.location): string {
  const url = new URL(apiUrl, page.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${url.href.replace(/\/$/, '')}/live`;
}

// Opens the socket; tests replace it.
export const WEB_SOCKET = new InjectionToken<<T>(config: WebSocketSubjectConfig<T>) => WebSocketSubject<T>>(
  'WEB_SOCKET',
  { providedIn: 'root', factory: () => webSocket },
);

// Live updates from the backend, over one WebSocket shared by every
// subscriber. The socket opens with the first subscriber and closes after
// the last; a lost connection is retried with growing delays. Messages that
// aren't events (the heartbeat's 'pong') are skipped.
@Injectable({ providedIn: 'root' })
export class LiveUpdates {
  private readonly url = liveUrl(inject(API_URL));
  private readonly openSocket = inject(WEB_SOCKET);

  readonly events$: Observable<LiveEvent> = defer(() => {
    const socket = this.openSocket<LiveEvent | string | null>({
      url: this.url,
      // Not every message is JSON ('pong').
      deserializer: (message) => parseEvent(message.data),
      // The heartbeat is sent as it is, not as JSON.
      serializer: (value) => value as string,
    });
    const heartbeat = interval(PING_EVERY_MS).pipe(
      tap(() => socket.next(PING)),
      ignoreElements(),
    );
    return merge(socket, heartbeat);
  }).pipe(
    filter(isLiveEvent),
    retry({ delay: (_error, attempt) => timer(Math.min(RETRY_MAX_MS, RETRY_FIRST_MS * 2 ** (attempt - 1))) }),
    share(),
  );
}

function parseEvent(data: unknown): LiveEvent | null {
  if (typeof data !== 'string') return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function isLiveEvent(value: unknown): value is LiveEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as LiveEvent).type === 'article-created' &&
    typeof (value as LiveEvent).article?.id === 'string'
  );
}
