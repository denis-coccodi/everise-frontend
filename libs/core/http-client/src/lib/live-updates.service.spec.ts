import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { WebSocketSubjectConfig } from 'rxjs/webSocket';
import { API_URL } from './api-url.token';
import { LiveEvent, LiveUpdates, WEB_SOCKET, liveUrl } from './live-updates.service';

// A stand-in for the socket: what the app sent, and a way to push messages
// through the service's deserializer, as a real socket would.
class FakeSocket extends Subject<unknown> {
  readonly sent: unknown[] = [];
  constructor(readonly config: WebSocketSubjectConfig<unknown>) {
    super();
  }
  override next(value: unknown) {
    this.sent.push(value);
  }
  receive(data: string) {
    super.next(this.config.deserializer?.({ data } as MessageEvent));
  }
  fail() {
    super.error(new Error('connection lost'));
  }
}

const event = {
  type: 'article-created',
  article: { id: '4f8e2c1a-0000-4000-8000-000000000001', title: 'Duty Found: Sastasha', tagList: ['roulette'] },
} as LiveEvent;

describe('liveUrl', () => {
  it('turns the API address into its WebSocket address', () => {
    expect(liveUrl('/api', { href: 'https://everise.dev/home' })).toBe('wss://everise.dev/api/live');
    expect(liveUrl('http://localhost:8080/api', { href: 'http://localhost:4200/' })).toBe(
      'ws://localhost:8080/api/live',
    );
  });
});

describe('LiveUpdates', () => {
  let sockets: FakeSocket[];
  let live: LiveUpdates;

  beforeEach(() => {
    sockets = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: API_URL, useValue: 'http://localhost:8080/api' },
        {
          provide: WEB_SOCKET,
          useValue: (config: WebSocketSubjectConfig<unknown>) => {
            const socket = new FakeSocket(config);
            sockets.push(socket);
            return socket;
          },
        },
      ],
    });
    live = TestBed.inject(LiveUpdates);
  });

  afterEach(() => vi.useRealTimers());

  it('opens one socket for all subscribers, and only while someone listens', () => {
    expect(sockets).toHaveLength(0);
    const first = live.events$.subscribe();
    const second = live.events$.subscribe();
    expect(sockets).toHaveLength(1);
    expect(sockets[0].config.url).toBe('ws://localhost:8080/api/live');

    first.unsubscribe();
    second.unsubscribe();
    expect(sockets[0].observed).toBe(false);
  });

  it('passes events on and skips anything else, such as the heartbeat reply', () => {
    const received: LiveEvent[] = [];
    live.events$.subscribe((e) => received.push(e));

    sockets[0].receive('pong');
    sockets[0].receive(JSON.stringify(event));
    sockets[0].receive('{"type":"something-else"}');

    expect(received).toEqual([event]);
  });

  it('sends a heartbeat every 25 seconds', () => {
    vi.useFakeTimers();
    const subscription = live.events$.subscribe();

    vi.advanceTimersByTime(50_000);

    expect(sockets[0].sent).toEqual(['ping', 'ping']);
    subscription.unsubscribe();
  });

  it('reconnects after a lost connection, waiting longer each time', () => {
    vi.useFakeTimers();
    const subscription = live.events$.subscribe();

    sockets[0].fail();
    vi.advanceTimersByTime(999);
    expect(sockets).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(2);

    sockets[1].fail();
    vi.advanceTimersByTime(1_999);
    expect(sockets).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(3);
    subscription.unsubscribe();
  });
});
