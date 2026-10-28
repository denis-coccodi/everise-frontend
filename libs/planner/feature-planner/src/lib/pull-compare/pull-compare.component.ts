import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, signal } from '@angular/core';
import { LogEntry, PlanEntry, PlanUseEntry, compareLog, pullClockTenths } from '@everise/planner/data-access';
import { ButtonComponent } from '@everise/ui/components';
import { EditPickerComponent } from '../edit-picker/edit-picker.component';
import type { EditChoice, EditSlot, Severity, SeverityTier } from '@everise/planner/scheduler';

const percent = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 0 });
// How hard an attack hits, in words, and what that calls for.
const TIER_NAMES: Record<SeverityTier, string> = {
  light: 'Light',
  moderate: 'Moderate',
  heavy: 'Heavy',
  lethal: 'Lethal',
  overkill: 'Overkill',
};
const TIER_HINTS: Record<SeverityTier, string> = {
  light: 'Healing covers it.',
  moderate: 'Some mitigation, or a heal after.',
  heavy: 'Party mitigation or a shield.',
  lethal: 'Kills without mitigation: stack it.',
  overkill: 'Stack everything, or an invulnerability.',
};
// Physical and magic mitigation each take off their share; nothing takes
// off special (unique) damage.
const DAMAGE_NAMES: Record<NonNullable<Severity['damageType']>, string> = {
  physical: 'Physical',
  magic: 'Magic',
  unique: 'Special',
};
const KIND_NAMES: Record<Severity['kind'], string> = {
  raidwide: 'Raidwide',
  tankbuster: 'Tank buster',
  targeted: 'Targeted',
};
import { PlanEntryComponent } from '../plan-entry/plan-entry.component';
import { PlayedEntryComponent } from '../played-entry/played-entry.component';

// A player's pull as played and as planned, on one timeline: a row per
// moment, what happened then beside what the plan has then. Laptops and up
// show both sides; narrower screens the one `shown` (the pull view's tabs).
// On laptops it scrolls on its own, in about two thirds of the screen, its
// headings kept in view; elsewhere the page scrolls, the headings still
// kept in view.
@Component({
  selector: 'cdt-planner-pull-compare',
  templateUrl: './pull-compare.component.html',
  styleUrl: './pull-compare.component.scss',
  imports: [ButtonComponent, EditPickerComponent, PlanEntryComponent, PlayedEntryComponent],
  host: { '[class.show-plan]': "shown() === 'plan'", '[class.no-plan]': 'planned() === null' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PullCompareComponent {
  readonly player = input.required<string>();
  readonly played = input.required<LogEntry[]>();
  // Null before the pull is planned.
  readonly planned = input.required<PlanEntry[] | null>();
  readonly shown = input<'played' | 'plan'>('played');
  // Editing the plan by hand: a skill removed, or one added at a slot near
  // a row (`slotsFor` it, and `choicesFor` each slot).
  readonly editing = input(false);
  readonly slotsFor = input<(at: number) => EditSlot[]>(() => []);
  readonly choicesFor = input<(at: number) => EditChoice[]>(() => []);
  readonly party = input<{ id: number; name: string }[]>([]);
  readonly defaultTarget = input<number | null>(null);
  readonly removed = output<PlanUseEntry>();
  readonly added = output<{ at: number; action: number; target: number | null }>();
  // The row whose picker is open.
  protected readonly picking = signal<number | null>(null);

  protected add(skill: { at: number; action: number; target: number | null }) {
    this.picking.set(null);
    this.added.emit(skill);
  }

  protected readonly clock = pullClockTenths;
  protected readonly TIER_NAMES = TIER_NAMES;
  protected readonly KIND_NAMES = KIND_NAMES;
  protected readonly DAMAGE_NAMES = DAMAGE_NAMES;
  // What a tier means, for its tooltip.
  protected severityHint(s: Severity) {
    const share = percent.format(s.share);
    return `${TIER_NAMES[s.tier]}: about ${share} of max HP before mitigation. ${TIER_HINTS[s.tier]}`;
  }
  protected readonly rows = computed(() => compareLog(this.played(), this.planned() ?? []));
  // The moment last opened from elsewhere (the HP chart), marked.
  protected readonly revealed = signal<number | null>(null);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  // Scrolls to the first moment from `at` on (or the last one), and marks it.
  reveal(at: number) {
    const rows = this.rows();
    const row = rows.find((r) => r.at >= at) ?? rows.at(-1);
    if (!row) return;
    this.revealed.set(row.at);
    const element = this.host.nativeElement.querySelector(`tr[data-at="${row.at}"]`);
    element?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
}
