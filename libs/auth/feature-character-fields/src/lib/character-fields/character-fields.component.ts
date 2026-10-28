import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FieldTree, FormField } from '@angular/forms/signals';
import { InputErrorsComponent } from '@everise/core/forms';
import { MarketService } from '@everise/market/data-access';
import { FieldComponent, InputComponent, MessageComponent } from '@everise/ui/components';
import { catchError, map, of } from 'rxjs';

// A member's character: its name and world, optional, both or neither (the
// form's schema applies characterRules). <cdt-character-fields
// [name]="form.characterName" [world]="form.server" />. The worlds are the
// ones the backend accepts, a group per data centre.
@Component({
  selector: 'cdt-character-fields',
  templateUrl: './character-fields.component.html',
  styleUrl: './character-fields.component.scss',
  imports: [FieldComponent, FormField, InputComponent, InputErrorsComponent, MessageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterFieldsComponent {
  readonly name = input.required<FieldTree<string>>();
  readonly world = input.required<FieldTree<string>>();

  // The data centres, each with its region's name; null when they couldn't
  // be loaded.
  protected readonly dataCentres = toSignal(
    inject(MarketService)
      .regions()
      .pipe(
        map(({ regions }) =>
          regions.flatMap((region) => region.dataCentres.map((dataCentre) => ({ ...dataCentre, region: region.name }))),
        ),
        catchError(() => of(null)),
      ),
    { initialValue: [] },
  );

  // A world that's chosen but not in the list (the list failed to load):
  // still an option, so the select shows it.
  protected readonly unlisted = computed(() => {
    const world = this.world()().value();
    const listed = (this.dataCentres() ?? []).some((dataCentre) =>
      dataCentre.worlds.some((option) => option.name === world),
    );
    return world && !listed ? world : null;
  });
}
