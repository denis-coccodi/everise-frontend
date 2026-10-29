import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { EditItem, pullClockTenths } from '@everise/planner/data-access';
import { ButtonComponent } from '@everise/ui/components';
import { ActionNameComponent } from '../action-name/action-name.component';

// The user's edits to the open player's plan, in time order, each with its
// own Undo ("Removed Rampart at 1:02.3"), so one can go without the rest.
@Component({
  selector: 'cdt-planner-edit-list',
  templateUrl: './edit-list.component.html',
  styleUrl: './edit-list.component.scss',
  imports: [ActionNameComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditListComponent {
  readonly items = input.required<EditItem[]>();
  readonly undone = output<EditItem>();
  protected readonly clock = pullClockTenths;
}
