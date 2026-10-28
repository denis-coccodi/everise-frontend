import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { EditChoice, EditSlot } from '@everise/planner/scheduler';
import { ButtonComponent, FieldComponent, InputComponent } from '@everise/ui/components';

// Adding a skill to the plan by hand: where (one of the slots near the
// moment, in the player's own rotation), then which: the skills that fit
// there as buttons, the others greyed out with why ("Recast: back at
// 2:20"), a GCD saying which of theirs it takes the place of.
@Component({
  selector: 'cdt-planner-edit-picker',
  templateUrl: './edit-picker.component.html',
  styleUrl: './edit-picker.component.scss',
  imports: [ButtonComponent, FieldComponent, InputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditPickerComponent {
  readonly slots = input.required<EditSlot[]>();
  readonly choicesFor = input.required<(at: number) => EditChoice[]>();
  // An id for its fields, unique on the page.
  readonly key = input.required<string>();
  readonly picked = output<{ at: number; action: number }>();
  readonly closed = output<void>();

  // The slot picked; until then, the first where something fits.
  private readonly slotIndex = signal<number | null>(null);
  protected readonly shownIndex = computed(() => {
    const picked = this.slotIndex();
    if (picked !== null) return picked;
    const useful = this.slots().findIndex((s) => this.fitting(s).some((c) => c.ok));
    return Math.max(0, useful);
  });
  protected readonly slot = computed(() => this.slots()[this.shownIndex()] ?? null);
  // The skills of the slot's kind: a GCD in place of one of theirs, an
  // oGCD in a weave slot.
  protected readonly choices = computed(() => {
    const slot = this.slot();
    return slot ? this.fitting(slot) : [];
  });

  private fitting(slot: EditSlot) {
    const inPlace = slot.label.startsWith('In place');
    return this.choicesFor()(slot.at).filter((c) => c.gcd === inPlace);
  }

  protected pickSlot(value: string) {
    this.slotIndex.set(Number(value));
  }

  protected pick(choice: EditChoice) {
    const slot = this.slot();
    if (slot && choice.ok) this.picked.emit({ at: slot.at, action: choice.action });
  }
}
