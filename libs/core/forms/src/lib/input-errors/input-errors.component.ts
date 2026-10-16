import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ReadonlyFieldTree } from '@angular/forms/signals';
import { ErrorMapperPipe } from '../error-mapper/error-mapper.pipe';

@Component({
  selector: 'cdt-input-errors',
  templateUrl: './input-errors.component.html',
  styleUrl: '../error-messages.scss',
  // Always present, so screen readers announce a message when it appears.
  host: { 'aria-live': 'polite' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ErrorMapperPipe],
})
export class InputErrorsComponent {
  // A signal form's field: <cdt-input-errors [field]="form.email" />.
  readonly field = input.required<ReadonlyFieldTree<unknown>>();

  // Once the person has changed the field, and only while it's wrong.
  protected readonly errors = computed(() => {
    const state = this.field()();
    return state.invalid() && state.dirty() ? state.errors() : [];
  });
}
