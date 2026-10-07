import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, Subject, defer, filter, ignoreElements, interval, merge, retry, share, tap, timer } from 'rxjs';
import { WebSocketSubject, WebSocketSubjectConfig, webSocket } from 'rxjs/webSocket';
import { ArticleCreatedEvent, SandsEvent } from '@realworld/core/api-types';
import { API_URL } from './api-url.token';

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

  private readonly opened = new Subject<void>();

  // Every message, from the one socket.
  private readonly messages$: Observable<unknown> = defer(() => {
    const socket = this.openSocket<unknown>({
      url: this.url,
      // Not every message is JSON ('pong').
      deserializer: (message) => parseEvent(message.data),
      // The heartbeat is sent as it is, not as JSON.
      serializer: (value) => value as string,
      openObserver: { next: () => this.opened.next() },
    });
    const heartbeat = interval(PING_EVERY_MS).pipe(
      tap(() => socket.next(PING)),
      ignoreElements(),
    );
    return merge(socket, heartbeat);
  }).pipe(
    retry({ delay: (_error, attempt) => timer(Math.min(RETRY_MAX_MS, RETRY_FIRST_MS * 2 ** (attempt - 1))) }),
    share(),
  );

  // New posts.
  readonly events$: Observable<ArticleCreatedEvent> = this.messages$.pipe(filter(isArticleCreatedEvent));

  // What happens in the Waking Sands room.
  readonly sands$: Observable<SandsEvent> = this.messages$.pipe(filter(isSandsEvent));

  // Each time the socket (re)connects. Events sent while it was connecting
  // or down are lost, so a page that must not miss any reloads then.
  readonly opened$: Observable<void> = this.opened.asObservable();
}

function parseEvent(data: unknown): unknown {
  if (typeof data !== 'string') return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function isArticleCreatedEvent(value: unknown): value is ArticleCreatedEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as ArticleCreatedEvent).type === 'article-created' &&
    typeof (value as ArticleCreatedEvent).article?.id === 'string'
  );
}

function isSandsEvent(value: unknown): value is SandsEvent {
  const event = value as SandsEvent | null;
  if (typeof event !== 'object' || event === null) return false;
  switch (event.type) {
    case 'sands-line':
      return typeof event.line?.id === 'string' && typeof event.line.text === 'string';
    case 'sands-presence':
      return Array.isArray(event.present);
    case 'sands-writing':
      return event.character === null || typeof event.character === 'string';
    default:
      return false;
  }
}
