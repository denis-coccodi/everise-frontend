import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import { ButtonComponent, PanelComponent } from '@everise/ui/components';
import { PlannerToolComponent } from '../planner-tool/planner-tool.component';

// The fight planner: from a party's FFLogs report, how each hit of an
// Extreme, Savage or Ultimate pull landed and what covered it. Anyone can
// find the page and read what it does; using it needs a signed-in member
// (each new report spends the site's FFLogs points, and the API answers
// members only), so guests get the pitch and the way in.
@Component({
  selector: 'cdt-planner',
  templateUrl: './planner.component.html',
  styleUrl: './planner.component.scss',
  imports: [ButtonComponent, PanelComponent, PlannerToolComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerComponent {
  protected readonly auth = inject(AuthStore);
}
