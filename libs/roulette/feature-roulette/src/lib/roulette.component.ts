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
  ROULETTES_TYPE,
  RouletteSettings,
  RunMode,
  candidateName,
  defaultSettings,
  eligibleTypes,
  isPveRoulette,
  pickIndex,
  runModes,
} from './roulette-engine';
import { WheelComponent, wait } from './wheel/wheel.component';

const SETTINGS_KEY = 'everise-roulette-settings';
const ALL_MODES: RunMode[] = ['Min IL + Silence Echo', 'Unsynced', 'Join Party in Progress', 'Regular'];
const PAUSE_BETWEEN_WHEELS_MS = 600;

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'cdt-roulette',
  templateUrl: './roulette.component.html',
  styleUrls: ['./roulette.component.scss'],
  imports: [WheelComponent, ReelComponent, DutyFoundComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouletteComponent {
  private readonly dutiesService = inject(DutiesService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly typeWheel = viewChild.required<WheelComponent>('typeWheel');
  private readonly dutyReel = viewChild.required<ReelComponent>('dutyReel');
  private readonly modeWheel = viewChild.required<WheelComponent>('modeWheel');

  readonly roulettesType = ROULETTES_TYPE;

  readonly loadState = signal<LoadState>('loading');
  readonly groups = signal<DutyGroup[]>([]);
  readonly roulettes = signal<DutyRoulette[]>([]);
  readonly settings = signal<RouletteSettings>(defaultSettings([]));

  readonly spinning = signal(false);
  readonly status = signal('');
  readonly modes = signal<string[]>(ALL_MODES);
  readonly result = signal<RouletteResult | null>(null);
  readonly showResult = signal(false);

  readonly typeNames = computed(() => [...this.groups().map((g) => g.name), ROULETTES_TYPE]);
  readonly pveRoulettes = computed(() => this.roulettes().filter(isPveRoulette));
  readonly otherRoulettes = computed(() => this.roulettes().filter((r) => !isPveRoulette(r)));
  readonly options = computed(() => eligibleTypes(this.groups(), this.roulettes(), this.settings()));
  readonly wheelTypes = computed(() => {
    const names = this.options().map((o) => o.name);
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
          this.settings.set(loadSettings() ?? defaultSettings(roulettes));
          this.loadState.set(groups.length > 0 ? 'ready' : 'empty');
        },
        error: () => this.loadState.set('error'),
      });
  }

  isTypeOn(name: string) {
    return this.settings().types.includes(name);
  }

  isRouletteOn(id: number) {
    return this.settings().roulettes.includes(id);
  }

  toggleType(name: string, on: boolean) {
    this.updateSettings((s) => ({ ...s, types: toggled(s.types, name, on) }));
  }

  toggleRoulette(id: number, on: boolean) {
    this.updateSettings((s) => ({ ...s, roulettes: toggled(s.roulettes, id, on) }));
  }

  setAllTypes(on: boolean) {
    this.updateSettings((s) => ({ ...s, types: on ? this.typeNames() : [] }));
  }

  setLevel(which: 'minLevel' | 'maxLevel', value: string) {
    const level = value.trim() === '' ? null : Math.max(1, Math.min(100, Math.floor(Number(value))));
    this.updateSettings((s) => ({ ...s, [which]: Number.isNaN(level) ? null : level }));
  }

  // Spins the three wheels one after the other, then shows the result.
  async commence() {
    if (!this.canSpin()) return;

    const options = this.options();
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
      this.modes.set(modes);
      this.cdr.detectChanges();
      this.modeWheel().reset();
      const modeIndex = pickIndex(modes.length);
      await this.modeWheel().spinTo(modeIndex);
      await wait(PAUSE_BETWEEN_WHEELS_MS / 2);

      const result = toResult(type.name, candidate, modes[modeIndex]);
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
    saveSettings(settings);
  }
}

function toggled<T>(list: T[], item: T, on: boolean) {
  const without = list.filter((x) => x !== item);
  return on ? [...without, item] : without;
}

function reelItem(candidate: Candidate): ReelItem {
  if (candidate.kind === 'roulette') {
    return { title: candidate.roulette.name, detail: 'Duty: ???' };
  }
  const { level, itemLevel, expansion } = candidate.duty;
  return {
    title: candidate.duty.name,
    detail: [`Lv. ${level}`, itemLevel ? `i${itemLevel}` : '', expansion].filter(Boolean).join(' · '),
  };
}

function toResult(type: string, candidate: Candidate, mode: RunMode): RouletteResult {
  if (candidate.kind === 'roulette') {
    return {
      type,
      name: candidate.roulette.name,
      detail: `${candidate.roulette.dutyType} · the game picks the duty`,
      mode,
      dutyUnknown: true,
    };
  }
  return { type, name: candidate.duty.name, detail: reelItem(candidate).detail, mode, dutyUnknown: false };
}

// Settings are a per-browser convenience; storage can be unavailable.
function loadSettings(): RouletteSettings | null {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? (JSON.parse(saved) as RouletteSettings) : null;
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
