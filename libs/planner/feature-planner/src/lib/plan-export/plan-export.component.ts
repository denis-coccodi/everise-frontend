import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { API_URL } from '@everise/core/http-client';
import { PlanStore, PlannerStore, planSheet, planWorkbook, sheetIcons } from '@everise/planner/data-access';
import { ButtonComponent, MessageComponent } from '@everise/ui/components';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// The plan of the pull open as a spreadsheet to download, like a raid
// group's mitigation sheet: a row per attack, each player's skills in
// dropdowns with their icons, coloured by role.
@Component({
  selector: 'cdt-planner-plan-export',
  templateUrl: './plan-export.component.html',
  styleUrl: './plan-export.component.scss',
  imports: [ButtonComponent, MessageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanExportComponent {
  private readonly store = inject(PlannerStore);
  private readonly plans = inject(PlanStore);
  private readonly apiUrl = inject(API_URL);

  protected readonly busy = signal(false);
  protected readonly error = signal('');
  // The plan and what it was made from, when it's for the pull open.
  private readonly ready = computed(() => {
    const [plan, timeline] = [this.plans.plan(), this.plans.timeline()];
    const ours = this.plans.pullId() === this.store.pullId();
    return ours && plan && timeline && this.store.catalog.hasValue()
      ? { plan, timeline, catalog: this.store.catalog.value() }
      : null;
  });
  protected readonly shown = computed(() => !!this.ready());

  protected async download() {
    const ready = this.ready();
    if (!ready) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const picked = this.store.picked();
      const title = `${picked?.name ?? 'Fight'}, pull ${ready.timeline.pullId}`;
      const sheet = planSheet(ready.plan, ready.timeline, ready.catalog);
      // The icons go in the file, so they show offline with nothing to allow.
      const data = await planWorkbook(sheet, title, await sheetIcons(this.apiUrl, sheet));
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([data], { type: XLSX }));
      link.download = `${fileName(title)}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      this.error.set("The spreadsheet couldn't be made. Try again.");
    } finally {
      this.busy.set(false);
    }
  }
}

// "Vamp Fatale, pull 3" → "vamp-fatale-pull-3-plan".
const fileName = (title: string) =>
  `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-plan`;
