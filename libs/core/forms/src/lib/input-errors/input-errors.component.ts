import { KeyValuePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { ErrorMapperPipe } from '../error-mapper/error-mapper.pipe';
import { IsErrorVisibleDirective } from '../is-error-visible/is-error-visible.directive';

@Component({
  selector: 'cdt-input-errors',
  templateUrl: './input-errors.component.html',
  styleUrl: '../error-messages.scss',
  // Always present, so screen readers announce a message when it appears.
  host: { 'aria-live': 'polite' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KeyValuePipe, ErrorMapperPipe, IsErrorVisibleDirective],
})
export class InputErrorsComponent {
  readonly control = input.required<AbstractControl>();
}
