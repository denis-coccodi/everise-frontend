import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, viewChild } from '@angular/core';
import { MarketItem } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { MarketSearchStore, MarketStore, iconUrl } from '@everise/market/data-access';
import { FieldComponent, InputComponent } from '@everise/ui/components';

// The item shown, and a search to pick another (the page puts them in a
// panel). Reads the page's
// MarketStore and MarketSearchStore.
@Component({
  selector: 'cdt-market-item-picker',
  templateUrl: './market-item-picker.component.html',
  styleUrl: './market-item-picker.component.scss',
  imports: [FieldComponent, InputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketItemPickerComponent {
  protected readonly store = inject(MarketStore);
  protected readonly search = inject(MarketSearchStore);
  private readonly apiUrl = inject(API_URL);
  private readonly searchField = viewChild('field', { read: ElementRef<HTMLInputElement> });

  // What the search found, for screen readers.
  protected readonly found = computed(() => {
    switch (this.search.state()) {
      case 'searching':
        return 'Searching…';
      case 'done': {
        const count = this.search.results().length;
        return count ? `${count} item${count === 1 ? '' : 's'} found.` : NOTHING_FOUND;
      }
      case 'error':
        return this.search.error();
      default:
        return '';
    }
  });
  protected readonly nothingFound = NOTHING_FOUND;

  protected icon(item: MarketItem) {
    return iconUrl(this.apiUrl, item.icon);
  }

  // Shows the item, and empties the search for the next one.
  protected pick(item: MarketItem) {
    this.store.pick(item);
    this.search.search('');
    const field = this.searchField()?.nativeElement;
    if (field) {
      field.value = '';
      field.focus();
    }
  }
}

const NOTHING_FOUND = 'No item the market board sells has that name.';
