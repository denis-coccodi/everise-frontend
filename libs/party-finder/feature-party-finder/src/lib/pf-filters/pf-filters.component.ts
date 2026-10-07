import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DataCentre, PartyRole } from '@everise/core/api-types';
import { PartyFinderStore, categoryName } from '@everise/party-finder/data-access';
import { FieldComponent, InputComponent, PanelComponent, SwitchComponent } from '@everise/ui/components';

// What the Party Finder page shows: the data centre and the world the
// member plays from, a category, an open slot for a role, words to find,
// and two switches (listings without a duty, beginners welcome). Every
// change applies at once; the data centre and world are remembered.
@Component({
  selector: 'cdt-pf-filters',
  templateUrl: './pf-filters.component.html',
  styleUrl: './pf-filters.component.scss',
  imports: [PanelComponent, FieldComponent, InputComponent, SwitchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PfFiltersComponent {
  protected readonly store = inject(PartyFinderStore);
  protected readonly dataCentres: DataCentre[] = ['Light', 'Chaos'];
  protected readonly roles: { value: PartyRole; name: string }[] = [
    { value: 'tank', name: 'Tank' },
    { value: 'healer', name: 'Healer' },
    { value: 'dps', name: 'DPS' },
  ];
  protected readonly categoryName = categoryName;

  protected setDataCentre(value: string) {
    this.store.setDataCentre(value as DataCentre);
  }

  protected setWorld(value: string) {
    this.store.setFilters({ world: value ? Number(value) : null });
  }

  protected setRole(value: string) {
    this.store.setFilters({ role: value as PartyRole | '' });
  }
}
