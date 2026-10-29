import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { pullClockTenths, type PickedSkill } from '@everise/planner/data-access';
import type { EditChoice, EditSlot } from '@everise/planner/scheduler';
import { ButtonComponent, FieldComponent, InputComponent } from '@everise/ui/components';
import { ActionNameComponent } from '../action-name/action-name.component';

// Adding a skill to the plan by hand: where (one of the slots near the
// moment, in the player's own rotation), then which: the skills that fit
// there as buttons, the others greyed out with why ("Recast: back at
// 2:20"), a GCD saying which of theirs it takes the place of, and one
// that needs another used first (Temperance) when it comes with it.
@Component({
  selector: 'cdt-planner-edit-picker',
  templateUrl: './edit-picker.component.html',
  styleUrl: './edit-picker.component.scss',
  imports: [ActionNameComponent, ButtonComponent, FieldComponent, InputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditPickerComponent {
  readonly slots = input.required<EditSlot[]>();
  readonly choicesFor = input.required<(at: number) => EditChoice[]>();
  // An id for its fields, unique on the page.
  readonly key = input.required<string>();
  // The party, for a skill that goes on one of them, and who it goes on
  // until picked (a tank, most often).
  readonly party = input<{ id: number; name: string }[]>([]);
  readonly defaultTarget = input<number | null>(null);
  readonly picked = output<PickedSkill>();
  private readonly targetPicked = signal<number | null>(null);
  protected readonly target = computed(
    () => this.targetPicked() ?? this.defaultTarget() ?? this.party()[0]?.id ?? null,
  );
  protected readonly clock = pullClockTenths;
  protected readonly anyTargeted = computed(() => this.choices().some((c) => c.ok && c.targeted));
  protected readonly targetName = computed(() => this.party().find((p) => p.id === this.target())?.name ?? '');
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

  protected pickTarget(value: string) {
    this.targetPicked.set(Number(value));
  }

  protected pick(choice: EditChoice) {
    const slot = this.slot();
    if (slot && choice.ok) {
      const target = choice.targeted ? this.target() : null;
      const first = choice.first && { action: choice.first.action, at: choice.first.at };
      this.picked.emit({ at: slot.at, action: choice.action, target, first });
    }
  }
}
