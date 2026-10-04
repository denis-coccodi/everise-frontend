import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ButtonComponent, DialogComponent } from '@realworld/ui/components';

export interface RouletteResult {
  type: string;
  name: string;
  // Level and item level, or the roulette's duty type.
  detail: string;
  mode: string;
  // True when the game picks the duty (a duty roulette).
  dutyUnknown: boolean;
}

// The result, styled after the game's "Duty Found" window.
@Component({
  selector: 'cdt-duty-found',
  imports: [ButtonComponent, DialogComponent],
  templateUrl: './duty-found.component.html',
  styleUrls: ['./duty-found.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DutyFoundComponent {
  readonly result = input.required<RouletteResult>();
  readonly commence = output<void>();
  readonly withdraw = output<void>();

  private readonly commenceButton = viewChild.required<ElementRef<HTMLButtonElement>>('commenceButton');

  constructor() {
    afterNextRender(() => this.commenceButton().nativeElement.focus());
  }
}
