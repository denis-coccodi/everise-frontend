import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { API_URL } from '@everise/core/http-client';
import { TooltipComponent } from '@everise/ui/components';

// An action's name, with its icon from the game, and its tooltip shown on
// hover or keyboard focus where the catalog has one.
@Component({
  selector: 'cdt-planner-action-name',
  imports: [TooltipComponent],
  templateUrl: './action-name.component.html',
  styleUrl: './action-name.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionNameComponent {
  readonly name = input.required<string>();
  readonly icon = input<number | null | undefined>(null);
  readonly description = input<string | null | undefined>(null);

  private readonly apiUrl = inject(API_URL);
  // An icon that didn't load isn't shown again.
  protected readonly failed = signal(false);
  protected readonly src = computed(() => {
    const icon = this.icon();
    return icon && !this.failed() ? `${this.apiUrl}/market/icons/${icon}` : null;
  });
}
