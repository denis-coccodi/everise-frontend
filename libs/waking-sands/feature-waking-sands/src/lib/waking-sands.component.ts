import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@realworld/auth/data-access';
import { LiveUpdates, SandsLine } from '@realworld/core/http-client';
import { ButtonComponent, FieldComponent, InputComponent, PanelComponent } from '@realworld/ui/components';
import { Observable } from 'rxjs';
import { Character, WakingSandsService } from './waking-sands.service';

const MAX_LENGTH = 1000;
// The backend lets this many characters in at once.
const MAX_PRESENT = 3;
// For a line whose writer had no picture (as on the rest of the site).
const DEFAULT_PICTURE = '/assets/images/avatar-profile.png';

// The Waking Sands: one room every member shares, with FINAL FANTASY XIV
// characters (and the free company's own) voiced by an AI on the backend.
// Members bring characters in or send them out for everyone, and talk; the
// characters answer as they see fit, each other too. Everything arrives
// live, so everyone on the page sees the same room. Guests can watch.
@Component({
  selector: 'cdt-waking-sands',
  templateUrl: './waking-sands.component.html',
  styleUrl: './waking-sands.component.scss',
  imports: [RouterLink, ButtonComponent, FieldComponent, InputComponent, PanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WakingSandsComponent {
  private readonly service = inject(WakingSandsService);
  protected readonly authStore = inject(AuthStore);

  protected readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly available = signal(false);
  protected readonly characters = signal<Character[]>([]);
  protected readonly present = signal<string[]>([]);
  protected readonly lines = signal<SandsLine[]>([]);
  // The character writing an answer right now, or null.
  protected readonly writing = signal<string | null>(null);
  protected readonly draft = signal('');
  protected readonly sending = signal(false);
  protected readonly error = signal('');

  protected readonly maxLength = MAX_LENGTH;
  protected readonly maxPresent = MAX_PRESENT;
  protected readonly full = computed(() => this.present().length >= MAX_PRESENT);
  protected readonly defaultPicture = DEFAULT_PICTURE;
  protected readonly canSend = computed(() => this.authStore.loggedIn() && !this.sending() && !!this.draft().trim());
  protected readonly writingName = computed(() => {
    const id = this.writing();
    return id ? this.character(id)?.name ?? null : null;
  });

  private readonly logBox = viewChild<ElementRef<HTMLElement>>('logBox');

  constructor() {
    this.load();

    const live = inject(LiveUpdates);
    // Whatever happened while the live connection was opening or down.
    live.opened$.pipe(takeUntilDestroyed()).subscribe(() => this.load());
    live.sands$.pipe(takeUntilDestroyed()).subscribe((event) => {
      switch (event.type) {
        case 'sands-line':
          this.addLine(event.line);
          break;
        case 'sands-presence':
          this.present.set(event.present);
          break;
        case 'sands-writing':
          this.writing.set(event.character);
          break;
      }
    });

    // The newest line in view.
    afterRenderEffect(() => {
      this.lines();
      this.writing();
      const box = this.logBox()?.nativeElement;
      if (box) box.scrollTop = box.scrollHeight;
    });
  }

  protected character(id: string) {
    return this.characters().find((c) => c.id === id);
  }

  protected isPresent(id: string) {
    return this.present().includes(id);
  }

  // A member's line of the one signed in, shown on the right.
  protected isMine(line: SandsLine) {
    return line.from === 'member' && !!line.memberId && line.memberId === this.authStore.user().id;
  }

  protected invite(character: Character) {
    this.run(this.service.invite(character.id));
  }

  protected dismiss(character: Character) {
    this.run(this.service.dismiss(character.id));
  }

  // Enter sends; Shift+Enter starts a new line.
  protected onEnter(event: Event) {
    if ((event as KeyboardEvent).shiftKey) return;
    event.preventDefault();
    this.send();
  }

  protected send(event?: Event) {
    event?.preventDefault();
    if (!this.canSend()) return;
    const text = this.draft().trim();
    this.sending.set(true);
    this.error.set('');
    this.service.say(text).subscribe({
      next: ({ line }) => {
        this.addLine(line);
        this.draft.set('');
        this.sending.set(false);
        // Anything the live updates missed (a dropped connection).
        this.load();
      },
      error: (error: unknown) => {
        this.sending.set(false);
        this.error.set(messageOf(error));
      },
    });
  }

  private run(request: Observable<{ present: string[] }>) {
    this.error.set('');
    request.subscribe({
      next: ({ present }) => this.present.set(present),
      error: (error: unknown) => this.error.set(messageOf(error)),
    });
  }

  private load() {
    this.service.room().subscribe({
      next: (room) => {
        this.available.set(room.available);
        this.characters.set(room.characters);
        this.present.set(room.present);
        for (const line of room.lines) this.addLine(line);
        this.loadState.set('ready');
      },
      error: () => {
        if (this.loadState() === 'loading') this.loadState.set('error');
      },
    });
  }

  // A line once, in the order it was said, whether it came live or loaded.
  private addLine(line: SandsLine) {
    this.lines.update((lines) =>
      lines.some((l) => l.id === line.id) ? lines : [...lines, line].sort((a, b) => a.at.localeCompare(b.at)),
    );
  }
}

// The backend's own words (a daily limit, a refused line), or an apology.
function messageOf(error: unknown) {
  if (error instanceof HttpErrorResponse) {
    const message = (error.error as { errors?: { body?: string[] } } | null)?.errors?.body?.[0];
    if (message && error.status !== 0) return message;
  }
  return "That didn't go through. Try again in a moment.";
}
