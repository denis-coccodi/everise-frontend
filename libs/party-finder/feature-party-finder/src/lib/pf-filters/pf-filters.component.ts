import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DataCentre, PartyRole } from '@everise/core/api-types';
import {
  HIGH_END,
  PartyFinderStore,
  SORT_ORDERS,
  SortOrder,
  categoryName,
  dataCentrePath,
} from '@everise/party-finder/data-access';
import { FieldComponent, InputComponent, PanelComponent, SwitchComponent } from '@everise/ui/components';

// What the Party Finder page shows: the data centre (any, by region) and
// the world the member plays from, a category, an open slot for a role,
// words to find, the order, and two switches (listings without a duty,
// beginners welcome). Every change applies at once; the data centre, world
// and order are remembered.
@Component({
  selector: 'cdt-pf-filters',
  templateUrl: './pf-filters.component.html',
  styleUrl: './pf-filters.component.scss',
  imports: [PanelComponent, FieldComponent, InputComponent, SwitchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PfFiltersComponent {
  protected readonly store = inject(PartyFinderStore);
  private readonly router = inject(Router);
  protected readonly sortOrders = SORT_ORDERS;
  protected readonly roles: { value: PartyRole; name: string }[] = [
    { value: 'tank', name: 'Tank' },
    { value: 'healer', name: 'Healer' },
    { value: 'dps', name: 'DPS' },
  ];
  protected readonly categoryName = categoryName;
  protected readonly highEnd = HIGH_END;

  // Each data centre has its own page (/party-finder/chaos), which the
  // page follows.
  protected setDataCentre(value: string) {
    this.store.rememberDataCentre(value as DataCentre);
    this.router.navigate(dataCentrePath(value));
  }

  protected setSort(value: string) {
    this.store.setSort(value as SortOrder);
  }

  protected setWorld(value: string) {
    this.store.setFilters({ world: value ? Number(value) : null });
  }

  protected setRole(value: string) {
    this.store.setFilters({ role: value as PartyRole | '' });
  }
}
