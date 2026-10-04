import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DutyGroup, DutyRoulette } from './duties.models';
import { DutiesService } from './duties.service';
import { DutyFoundComponent, RouletteResult } from './duty-found/duty-found.component';
import { ReelComponent, ReelItem } from './reel/reel.component';
import {
  Candidate,
  PICKED_TYPES,
  ROULETTES_TYPE,
  RouletteSettings,
  RunMode,
  candidateDetail,
  candidateName,
  defaultSettings,
  eligibleTypes,
  pickIndex,
  pickOptions,
  possibleModes,
  runModes,
  shortTypeName,
  spreadSample,
  todaysFrontline,
  typeCandidates,
  upgradeSettings,
} from './roulette-engine';
import { WheelComponent, wait } from './wheel/wheel.component';
import { ButtonComponent, CheckboxComponent, InputComponent, PanelComponent } from '@realworld/ui/components';

const SETTINGS_KEY = 'everise-roulette-settings';
const PAUSE_BETWEEN_WHEELS_MS = 600;
// Most outcomes the idle reel previews.
const REEL_PREVIEW_MAX = 60;

// The explanation above each picked type's list.
const PICK_LEGENDS: Record<string, string> = {
  [ROULETTES_TYPE]: 'Duty roulettes the first wheel\'s "Duty Roulettes" can land on',
  PvP: 'PvP queues the first wheel\'s "PvP" can land on',
  'Gold Saucer': 'Gold Saucer activities the first wheel\'s "Gold Saucer" can land on',
};

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'cdt-roulette',
  templateUrl: './roulette.component.html',
  styleUrls: ['./roulette.component.scss'],
  imports: [
    ButtonComponent,
    CheckboxComponent,
    InputComponent,
    PanelComponent,
    WheelComponent,
    ReelComponent,
    DutyFoundComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouletteComponent {
  private readonly dutiesService = inject(DutiesService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly typeWheel = viewChild.required<WheelComponent>('typeWheel');
  private readonly dutyReel = viewChild.required<ReelComponent>('dutyReel');
  private readonly modeWheel = viewChild.required<WheelComponent>('modeWheel');

  readonly loadState = signal<LoadState>('loading');
  readonly groups = signal<DutyGroup[]>([]);
  readonly roulettes = signal<DutyRoulette[]>([]);
  readonly settings = signal<RouletteSettings>(defaultSettings({}));

  readonly spinning = signal(false);
  readonly status = signal('');
  // The third wheel: the winning duty's party settings after a spin, until
  // the selection changes; before that, every setting the allowed duties offer.
  private readonly spunModes = signal<RunMode[] | null>(null);
  readonly result = signal<RouletteResult | null>(null);
  readonly showResult = signal(false);

  readonly pickable = computed(() => pickOptions(this.groups(), this.roulettes()));
  readonly frontlineMap = computed(() => todaysFrontline(this.groups()));

  // Each type with how many of its duties are within the level limits.
  readonly types = computed(() =>
    typeCandidates(this.groups(), this.pickable(), this.settings()).map((t) => ({
      name: t.name,
      count: t.candidates.length,
    })),
  );

  // The lists under the wheels, one per ticked picked type.
  readonly pickPanels = computed(() =>
    PICKED_TYPES.filter((type) => this.isTypeOn(type)).map((type) => ({
      type,
      legend: PICK_LEGENDS[type],
      options: (this.pickable()[type] ?? []).map((o) => ({
        key: o.key,
        name: candidateName(o.candidate),
        detail: candidateDetail(o.candidate, this.frontlineMap()),
      })),
    })),
  );

  readonly options = computed(() => eligibleTypes(this.groups(), this.pickable(), this.settings()));
  readonly modes = computed(() => this.spunModes() ?? possibleModes(this.options()));
  // What the reel shows before a spin: the possible outcomes of the allowed
  // types, in their order, sampled across all of them when there are many.
  readonly reelPreview = computed(() =>
    spreadSample(
      this.options().flatMap((o) => o.candidates.map((c) => this.reelItem(c))),
      REEL_PREVIEW_MAX,
    ),
  );
  readonly wheelTypes = computed(() => {
    const names = this.options().map((o) => shortTypeName(o.name));
    return names.length > 0 ? names : ['—'];
  });
  readonly levelError = computed(() => {
    const { minLevel, maxLevel } = this.settings();
    return minLevel !== null && maxLevel !== null && minLevel > maxLevel
      ? 'The minimum level is above the maximum level.'
      : '';
  });
  readonly canSpin = computed(
    () => this.loadState() === 'ready' && !this.spinning() && !this.levelError() && this.options().length > 0,
  );

  constructor() {
    this.dutiesService
      .getDutyLists()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: ({ groups, roulettes }) => {
          this.groups.set(groups);
          this.roulettes.set(roulettes);
          this.settings.set(upgradeSettings(loadSettings(), defaultSettings(this.pickable())));
          this.loadState.set(groups.length > 0 ? 'ready' : 'empty');
        },
        error: () => this.loadState.set('error'),
      });
  }

  isTypeOn(name: string) {
    return this.settings().types.includes(name);
  }

  isPicked(type: string, key: string) {
    return this.settings().picks[type]?.includes(key) ?? false;
  }

  toggleType(name: string, on: boolean) {
    this.updateSettings((s) => ({ ...s, types: toggled(s.types, name, on) }));
  }

  togglePick(type: string, key: string, on: boolean) {
    this.updateSettings((s) => ({ ...s, picks: { ...s.picks, [type]: toggled(s.picks[type] ?? [], key, on) } }));
  }

  setAllTypes(on: boolean) {
    this.updateSettings((s) => ({ ...s, types: on ? this.types().map((t) => t.name) : [] }));
  }

  setAllPicks(type: string, on: boolean) {
    const keys = on ? (this.pickable()[type] ?? []).map((o) => o.key) : [];
    this.updateSettings((s) => ({ ...s, picks: { ...s.picks, [type]: keys } }));
  }

  setLevel(which: 'minLevel' | 'maxLevel', value: string) {
    const level = value.trim() === '' ? null : Math.max(1, Math.min(100, Math.floor(Number(value))));
    this.updateSettings((s) => ({ ...s, [which]: Number.isNaN(level) ? null : level }));
  }

  private reelItem(candidate: Candidate): ReelItem {
    return { title: candidateName(candidate), detail: candidateDetail(candidate, this.frontlineMap()) };
  }

  // Spins the three wheels one after the other, then shows the result.
  async commence() {
    if (!this.canSpin()) return;

    const options = this.options();
    const frontlineMap = this.frontlineMap();
    const reelItem = (c: Candidate) => this.reelItem(c);
    this.spinning.set(true);
    this.showResult.set(false);
    this.result.set(null);

    try {
      this.status.set('Choosing a duty type…');
      const typeIndex = pickIndex(options.length);
      const type = options[typeIndex];
      await this.typeWheel().spinTo(typeIndex);
      await wait(PAUSE_BETWEEN_WHEELS_MS);

      this.status.set(`${type.name}: choosing a duty…`);
      const candidate = type.candidates[pickIndex(type.candidates.length)];
      await this.dutyReel().spinTo(type.candidates.map(reelItem), reelItem(candidate));
      await wait(PAUSE_BETWEEN_WHEELS_MS);

      this.status.set(`${candidateName(candidate)}: choosing the party settings…`);
      const modes = runModes(candidate);
      this.spunModes.set(modes);
      this.cdr.detectChanges();
      const modeIndex = pickIndex(modes.length);
      await this.modeWheel().spinTo(modeIndex);
      await wait(PAUSE_BETWEEN_WHEELS_MS / 2);

      const result = toResult(type.name, candidate, modes[modeIndex], frontlineMap);
      this.result.set(result);
      this.status.set(`Duty found: ${result.name}, ${result.mode}.`);
      this.showResult.set(true);
    } finally {
      this.spinning.set(false);
    }
  }

  closeResult() {
    this.showResult.set(false);
  }

  withdraw() {
    this.showResult.set(false);
    void this.commence();
  }

  private updateSettings(change: (s: RouletteSettings) => RouletteSettings) {
    const settings = change(this.settings());
    this.settings.set(settings);
    this.spunModes.set(null);
    saveSettings(settings);
  }
}

function toggled<T>(list: T[], item: T, on: boolean) {
  const without = list.filter((x) => x !== item);
  return on ? [...without, item] : without;
}

function toResult(type: string, candidate: Candidate, mode: RunMode, frontlineMap: string | null): RouletteResult {
  const detail = candidateDetail(candidate, frontlineMap);
  if (candidate.kind === 'roulette') {
    // The game picks the duty, except for today's known Frontline map.
    const known = detail.startsWith('Today:');
    return {
      type,
      name: candidate.roulette.name,
      detail: known ? detail : [candidate.roulette.dutyType, 'the game picks the duty'].filter(Boolean).join(' · '),
      mode,
      dutyUnknown: !known,
    };
  }
  return { type, name: candidate.duty.name, detail, mode, dutyUnknown: false };
}

// Settings are a per-browser convenience; storage can be unavailable.
function loadSettings(): unknown {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveSettings(settings: RouletteSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Not saved; the page works the same.
  }
}
