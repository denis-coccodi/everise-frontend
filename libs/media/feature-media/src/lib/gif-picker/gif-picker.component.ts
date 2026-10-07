import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { serverMessage } from '@everise/core/forms';
import { ButtonComponent, FieldComponent, InputComponent, MessageComponent } from '@everise/ui/components';
import { EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';
import { Gif, MediaService } from '@everise/media/data-access';

const SEARCH_DELAY_MS = 400;

// GIPHY's GIFs in the image dialog: trending ones to start with, a search
// once typing pauses, more on request. Emits the GIF picked.
@Component({
  selector: 'cdt-gif-picker',
  templateUrl: './gif-picker.component.html',
  styleUrl: './gif-picker.component.scss',
  imports: [ButtonComponent, FieldComponent, InputComponent, MessageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GifPickerComponent {
  private readonly media = inject(MediaService);

  readonly picked = output<Gif>();

  protected readonly query = signal('');
  protected readonly gifs = signal<Gif[]>([]);
  protected readonly next = signal<number | null>(null);
  protected readonly searching = signal(false);
  protected readonly error = signal('');
  private readonly searches = new Subject<string>();

  constructor() {
    this.searches
      .pipe(
        debounceTime(SEARCH_DELAY_MS),
        distinctUntilChanged(),
        tap(() => this.searching.set(true)),
        // A failed search shows its message and leaves the next one working.
        switchMap((query) =>
          this.media.searchGifs(query).pipe(
            catchError((error: unknown) => {
              this.failed(error);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ gifs, next }) => {
        this.searching.set(false);
        this.error.set('');
        this.gifs.set(gifs);
        this.next.set(next);
      });
    // Trending GIFs to start with.
    this.searches.next('');
  }

  protected search(query: string) {
    this.query.set(query);
    this.searches.next(query.trim());
  }

  protected more() {
    const offset = this.next();
    if (offset === null) return;
    this.searching.set(true);
    this.media.searchGifs(this.query().trim(), offset).subscribe({
      next: ({ gifs, next }) => {
        this.searching.set(false);
        this.gifs.update((shown) => [...shown, ...gifs]);
        this.next.set(next);
      },
      error: (error: unknown) => this.failed(error),
    });
  }

  private failed(error: unknown) {
    this.searching.set(false);
    this.error.set(serverMessage(error));
  }
}
