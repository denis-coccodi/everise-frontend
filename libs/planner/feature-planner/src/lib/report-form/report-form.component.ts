import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import { InputErrorsComponent } from '@everise/core/forms';
import { PlannerStore } from '@everise/planner/data-access';
import { ButtonComponent, FieldComponent, InputComponent, MessageComponent } from '@everise/ui/components';

const NOT_A_LINK = "That isn't an FFLogs report link. Copy it from the report's page on fflogs.com.";

// The FFLogs report to plan from: its link (a pull's link opens that pull)
// or its code.
@Component({
  selector: 'cdt-planner-report-form',
  templateUrl: './report-form.component.html',
  styleUrl: './report-form.component.scss',
  imports: [
    ButtonComponent,
    FieldComponent,
    FormField,
    FormRoot,
    InputComponent,
    InputErrorsComponent,
    MessageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportFormComponent {
  private readonly store = inject(PlannerStore);
  // The report open, after a reload too: its link.
  private readonly model = signal({ link: reportLink(this.store.code()) });
  protected readonly form = form(
    this.model,
    (path) => {
      required(path.link);
    },
    { submission: { action: async () => this.load() } },
  );
  // Why the link can't be opened.
  protected readonly problem = signal('');

  private load() {
    this.problem.set(this.store.open(this.model().link) ? '' : NOT_A_LINK);
  }
}

const reportLink = (code: string | undefined) => (code ? `https://www.fflogs.com/reports/${code}` : '');
