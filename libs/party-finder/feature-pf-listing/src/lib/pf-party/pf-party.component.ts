import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { PartyFinderBoard, PartyFinderListing, PartyRole } from '@everise/core/api-types';
import { API_URL, gameImageUrl } from '@everise/core/http-client';
import { TooltipComponent } from '@everise/ui/components';

type Slot = PartyFinderListing['slots'][number];

const ROLE_NAMES: Record<PartyRole, string> = { tank: 'Tank', healer: 'Healer', dps: 'DPS' };

// A party's slots as the in-game Party Finder shows them: the jobs in it as
// their framed icons, the open slots as the roles they take, with the jobs
// they accept in a tooltip. The open slots are one tab stop; the arrow keys
// move between them. Without an icon (not downloaded yet) a slot shows its
// job or roles in words.
@Component({
  selector: 'cdt-pf-party',
  templateUrl: './pf-party.component.html',
  styleUrl: './pf-party.component.scss',
  imports: [TooltipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PfPartyComponent {
  readonly slots = input.required<Slot[]>();
  readonly icons = input.required<PartyFinderBoard['icons']>();

  private readonly apiUrl = inject(API_URL);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  // Icons that didn't load: their slots show words instead, until the
  // listings are refreshed (every 30 seconds), when they're tried again.
  protected readonly missing = linkedSignal<Slot[], ReadonlySet<number>>({
    source: this.slots,
    computation: () => new Set(),
  });
  // The open slot that's the tab stop, among the open ones.
  protected readonly active = signal(0);

  protected readonly filled = computed(() => this.slots().filter((slot) => slot.job).length);
  // Each slot with its index among the open ones (-1 when filled).
  protected readonly entries = computed(() => {
    let open = 0;
    return this.slots().map((slot) => ({ slot, open: slot.job ? -1 : open++ }));
  });

  protected image(id: number | null) {
    return id && !this.missing().has(id) ? gameImageUrl(this.apiUrl, id) : undefined;
  }

  protected failed(id: number | null) {
    if (id) this.missing.update((ids) => new Set([...ids, id]));
  }

  protected roleIcon(role: PartyRole) {
    return this.icons()[role];
  }

  protected roleNames(slot: Slot) {
    return slot.roles.length === 3 ? 'Any role' : slot.roles.map((role) => ROLE_NAMES[role]).join(' or ');
  }

  // "Tank: PLD, WAR · Healer: WHM, SCH": the jobs an open slot accepts.
  protected accepts(slot: Slot) {
    return slot.accepts.map((group) => `${ROLE_NAMES[group.role]}: ${group.jobs.join(', ')}`).join(' · ');
  }

  protected move(event: Event) {
    if (!(event instanceof KeyboardEvent)) return;
    const triggers = [...this.host.nativeElement.querySelectorAll<HTMLElement>('.open .trigger')];
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step || triggers.length === 0) return;
    event.preventDefault();
    const next = (this.active() + step + triggers.length) % triggers.length;
    this.active.set(next);
    triggers[next].focus();
  }
}
