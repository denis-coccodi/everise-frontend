import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, signal } from '@angular/core';
import {
  DAMAGE_NAMES,
  KIND_NAMES,
  LogEntry,
  PlanEntry,
  PlanUseEntry,
  TIER_HINTS,
  TIER_NAMES,
  compareLog,
  pullClockTenths,
  type PickedSkill,
} from '@everise/planner/data-access';
import { ButtonComponent } from '@everise/ui/components';
import { EditPickerComponent } from '../edit-picker/edit-picker.component';
import type { EditChoice, EditSlot, Severity, SeverityTier } from '@everise/planner/scheduler';

const percent = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 0 });
import { PlanEntryComponent } from '../plan-entry/plan-entry.component';
import { TierPipsComponent } from '../tier-pips/tier-pips.component';
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
  imports: [ButtonComponent, EditPickerComponent, PlanEntryComponent, PlayedEntryComponent, TierPipsComponent],
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
  readonly added = output<PickedSkill>();
  // The row whose picker is open.
  protected readonly picking = signal<number | null>(null);

  protected add(skill: PickedSkill) {
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
    const together = s.with ? `, with ${s.with.join(', ')}` : '';
    return `${TIER_NAMES[s.tier]}: about ${share} of max HP before mitigation${together}. ${TIER_HINTS[s.tier]}`;
  }
  protected readonly anySeverity = computed(() => this.rows().some((r) => r.severity));
  protected readonly TIERS: SeverityTier[] = ['light', 'moderate', 'heavy', 'lethal', 'overkill'];
  protected readonly TIER_HINTS = TIER_HINTS;
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
