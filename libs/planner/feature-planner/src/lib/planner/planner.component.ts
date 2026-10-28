import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import { PlannerToolComponent } from '../planner-tool/planner-tool.component';

// The fight planner: from a party's FFLogs report, how each hit of an
// Extreme, Savage or Ultimate pull landed and what covered it. Guests may
// use it too, but each new report or pull spends the site's FFLogs points,
// so the API gives them a few an hour; a note says so, with the way in.
@Component({
  selector: 'cdt-planner',
  templateUrl: './planner.component.html',
  styleUrl: './planner.component.scss',
  imports: [PlannerToolComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerComponent {
  protected readonly auth = inject(AuthStore);
}
