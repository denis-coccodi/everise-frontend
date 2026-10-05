import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { FormErrorsStore } from '../forms-errors.store';

@Component({
  selector: 'cdt-list-errors',
  templateUrl: './list-errors.component.html',
  styleUrl: '../error-messages.scss',
  // The server's answer to a form: announced as soon as it appears.
  host: { role: 'alert' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListErrorsComponent implements OnDestroy {
  protected readonly formErrorsStore = inject(FormErrorsStore);

  ngOnDestroy() {
    this.formErrorsStore.setErrors({});
  }
}
