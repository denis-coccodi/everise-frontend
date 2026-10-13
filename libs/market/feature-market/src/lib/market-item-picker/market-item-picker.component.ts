import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, viewChild } from '@angular/core';
import { MarketItem } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { MAX_ITEMS, MarketStore, iconUrl } from '@everise/market/data-access';
import { ButtonComponent, FieldComponent, IconComponent, InputComponent, PanelComponent } from '@everise/ui/components';

// The items compared: the ones picked, each in its line's colour with a
// button to remove it, and a search to add more, up to 3. Reads the page's
// MarketStore.
@Component({
  selector: 'cdt-market-item-picker',
  templateUrl: './market-item-picker.component.html',
  styleUrl: './market-item-picker.component.scss',
  imports: [ButtonComponent, FieldComponent, IconComponent, InputComponent, PanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketItemPickerComponent {
  protected readonly store = inject(MarketStore);
  private readonly apiUrl = inject(API_URL);
  private readonly searchField = viewChild('search', { read: ElementRef<HTMLInputElement> });
  protected readonly max = MAX_ITEMS;

  // What the search found, for screen readers.
  protected readonly found = computed(() => {
    switch (this.store.searchState()) {
      case 'searching':
        return 'Searching…';
      case 'done': {
        const count = this.store.results().length;
        return count
          ? `${count} item${count === 1 ? '' : 's'} found.`
          : 'No item the market board sells has that name.';
      }
      case 'error':
        return this.store.searchError();
      default:
        return '';
    }
  });

  protected icon(item: MarketItem) {
    return iconUrl(this.apiUrl, item.icon);
  }

  protected picked(item: MarketItem) {
    return this.store.items().includes(item.id);
  }

  // Adds the item, and empties the search for the next one.
  protected add(item: MarketItem) {
    this.store.add(item);
    this.store.search('');
    const field = this.searchField()?.nativeElement;
    if (field) {
      field.value = '';
      field.focus();
    }
  }
}
