import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@realworld/auth/data-access';
import { ButtonComponent, FieldComponent, InputComponent, PanelComponent } from '@realworld/ui/components';
import { Character, ChatLine, WakingSandsService } from './waking-sands.service';

// What the conversation shows: the member's lines, the characters' lines,
// and notes such as "Tataru joins the conversation" (never sent).
export type LogEntry =
  | { kind: 'member'; text: string }
  | { kind: 'character'; id: string; text: string }
  | { kind: 'note'; text: string };

// The latest lines the backend takes.
const MAX_LINES = 40;
const MAX_LENGTH = 1000;
// The conversation survives a reload in this tab, nowhere else.
const STORAGE_KEY = 'wakingSands';

// The Waking Sands: a chat with FINAL FANTASY XIV characters, played by an
// AI model on the backend. The member invites who joins; everyone present
// answers each line in turn. Open to guests, who can look around; talking
// needs an account, like posting.
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
  protected readonly log = signal<LogEntry[]>([]);
  protected readonly draft = signal('');
  // Who is writing an answer right now ("Tataru"), or null.
  protected readonly writing = signal<string | null>(null);
  protected readonly error = signal('');

  protected readonly maxLength = MAX_LENGTH;
  protected readonly canSend = computed(
    () => this.authStore.loggedIn() && !this.writing() && this.present().length > 0 && !!this.draft().trim(),
  );

  private readonly logBox = viewChild<ElementRef<HTMLElement>>('logBox');

  constructor() {
    this.restore();
    this.service.characters().subscribe({
      next: ({ available, characters }) => {
        this.available.set(available);
        this.characters.set(characters);
        // Only characters that still exist stay in the conversation.
        this.present.update((ids) => ids.filter((id) => characters.some((c) => c.id === id)));
        this.loadState.set('ready');
      },
      error: () => this.loadState.set('error'),
    });

    effect(() => this.save(this.present(), this.log()));

    // The newest line in view.
    afterRenderEffect(() => {
      this.log();
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

  protected invite(character: Character) {
    this.present.update((ids) => [...ids, character.id]);
    this.note(`${character.name} joins the conversation.`);
  }

  protected leave(character: Character) {
    this.present.update((ids) => ids.filter((id) => id !== character.id));
    this.note(`${character.name} leaves the conversation.`);
  }

  protected startOver() {
    this.log.set([]);
    this.error.set('');
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
    this.draft.set('');
    this.error.set('');
    this.log.update((log) => [...log, { kind: 'member', text }]);

    const present = this.present();
    this.writing.set(namesList(present.map((id) => this.character(id)?.name ?? id)));
    this.service.replies(present, this.lines()).subscribe({
      next: (replies) => {
        this.log.update((log) => [
          ...log,
          ...replies.map((reply) => ({ kind: 'character' as const, id: reply.character, text: reply.text })),
        ]);
        this.writing.set(null);
      },
      error: (error: unknown) => {
        this.writing.set(null);
        this.error.set(messageOf(error));
      },
    });
  }

  // The conversation as the backend reads it.
  private lines(): ChatLine[] {
    return this.log()
      .flatMap((entry): ChatLine[] =>
        entry.kind === 'member'
          ? [{ from: 'member', text: entry.text }]
          : entry.kind === 'character'
            ? [{ from: entry.id, text: entry.text }]
            : [],
      )
      .slice(-MAX_LINES);
  }

  private note(text: string) {
    this.log.update((log) => [...log, { kind: 'note', text }]);
  }

  private restore() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as {
        present?: unknown;
        log?: unknown;
      } | null;
      if (Array.isArray(saved?.present)) this.present.set(saved.present.filter((id) => typeof id === 'string'));
      if (Array.isArray(saved?.log)) this.log.set(saved.log.filter(isLogEntry));
    } catch {
      // No storage, or something unreadable in it: start afresh.
    }
  }

  private save(present: string[], log: LogEntry[]) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ present, log }));
    } catch {
      // No storage: the conversation lasts as long as the page.
    }
  }
}

function isLogEntry(value: unknown): value is LogEntry {
  const entry = value as Partial<LogEntry> | null;
  return (
    typeof entry?.text === 'string' &&
    (entry.kind === 'member' ||
      entry.kind === 'note' ||
      (entry.kind === 'character' && typeof (entry as { id?: unknown }).id === 'string'))
  );
}

// "Tataru", "Tataru and Urianger", "Tataru, Urianger and Y'shtola".
function namesList(names: string[]) {
  return names.length < 2 ? names[0] ?? '' : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// The backend's own words for a limit ("come back after midnight"), or a
// general apology.
function messageOf(error: unknown) {
  if (error instanceof HttpErrorResponse && error.status === 429) {
    const message = (error.error as { errors?: { body?: string[] } } | null)?.errors?.body?.[0];
    if (message) return message;
  }
  return 'Nobody could answer just now. Try again in a moment.';
}
