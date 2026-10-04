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
import { DutyGroup, DutyRoulette, Job } from './duties.models';
import { DutiesService } from './duties.service';
import { DutyFoundComponent, RouletteResult } from './duty-found/duty-found.component';
import { ReelComponent, ReelItem } from './reel/reel.component';
import {
  Candidate,
  DEALERS_CHOICE,
  PICKED_TYPES,
  ROULETTES_TYPE,
  RouletteSettings,
  RunMode,
  SAME_JOB,
  awktrailGuideUrl,
  candidateDetail,
  candidateName,
  dealableJobs,
  defaultSettings,
  eligibleTypes,
  pickIndex,
  pickOptions,
  possibleModes,
  runModeDetail,
  runModes,
  spreadSample,
  todaysFrontline,
  typeCandidates,
  upgradeSettings,
} from './roulette-engine';
import { wait } from './motion';
import { ButtonComponent, CheckboxComponent, InputComponent, PanelComponent } from '@realworld/ui/components';

const SETTINGS_KEY = 'everise-roulette-settings';
const PAUSE_BETWEEN_REELS_MS = 600;
// The pause between landing on dealer's choice and dealing the job.
const PAUSE_BEFORE_DEAL_MS = 500;
// Most outcomes the idle duty reel previews.
const REEL_PREVIEW_MAX = 60;

// The explanation above each picked type's list.
const PICK_LEGENDS: Record<string, string> = {
  [ROULETTES_TYPE]: 'Duty roulettes the first reel\'s "Duty Roulettes" can land on',
  PvP: 'PvP queues the first reel\'s "PvP" can land on',
  'Gold Saucer': 'Gold Saucer activities the first reel\'s "Gold Saucer" can land on',
};

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'cdt-roulette',
  templateUrl: './roulette.component.html',
  styleUrls: ['./roulette.component.scss'],
  imports: [ButtonComponent, CheckboxComponent, InputComponent, PanelComponent, ReelComponent, DutyFoundComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouletteComponent {
  private readonly dutiesService = inject(DutiesService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly typeReel = viewChild.required<ReelComponent>('typeReel');
  private readonly dutyReel = viewChild.required<ReelComponent>('dutyReel');
  private readonly modeReel = viewChild.required<ReelComponent>('modeReel');

  readonly loadState = signal<LoadState>('loading');
  readonly groups = signal<DutyGroup[]>([]);
  readonly roulettes = signal<DutyRoulette[]>([]);
  readonly jobs = signal<Job[]>([]);
  private readonly rouletteIcon = signal<number | null>(null);
  readonly settings = signal<RouletteSettings>(defaultSettings({}));

  readonly spinning = signal(false);
  readonly status = signal('');
  // The third reel: the winning duty's party settings after a spin, until
  // the selection changes; before that, every setting the allowed duties offer.
  private readonly spunModes = signal<RunMode[] | null>(null);
  readonly result = signal<RouletteResult | null>(null);
  readonly showResult = signal(false);

  readonly pickable = computed(() => pickOptions(this.groups(), this.roulettes()));
  readonly frontlineMap = computed(() => todaysFrontline(this.groups()));
  // The jobs dealer's choice deals; without any it isn't offered.
  private readonly dealable = computed(() => dealableJobs(this.jobs()));
  private readonly canDeal = computed(() => this.dealable().length > 0);

  // Each duty type's icon, by type name.
  private readonly typeIcons = computed(
    () =>
      new Map<string, string | undefined>([
        ...this.groups().map((g): [string, string | undefined] => [g.name, this.dutiesService.imageUrl(g.icon)]),
        [ROULETTES_TYPE, this.dutiesService.imageUrl(this.rouletteIcon())],
      ]),
  );

  // Each type with how many of its duties are within the level limits.
  readonly types = computed(() =>
    typeCandidates(this.groups(), this.pickable(), this.settings()).map((t) => ({
      name: t.name,
      count: t.candidates.length,
      icon: this.typeIcons().get(t.name),
    })),
  );

  // The lists under the reels, one per ticked picked type.
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
  readonly modes = computed(() => this.spunModes() ?? possibleModes(this.options(), this.canDeal()));

  // What each reel shows before a spin: everything it can land on.
  readonly typePreview = computed(() => this.options().map((o) => typeItem(o.name, o.candidates.length)));
  // The duties of the allowed types, in their order, sampled across all of
  // them when there are many.
  readonly dutyPreview = computed(() =>
    spreadSample(
      this.options().flatMap((o) => o.candidates.map((c) => this.reelItem(c))),
      REEL_PREVIEW_MAX,
    ),
  );
  readonly modePreview = computed(() => this.modes().map(modeItem));
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
        next: ({ groups, roulettes, rouletteIcon, jobs }) => {
          this.groups.set(groups);
          this.roulettes.set(roulettes);
          this.rouletteIcon.set(rouletteIcon);
          this.jobs.set(jobs);
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

  // Spins the three reels one after the other, then shows the result.
  async commence() {
    if (!this.canSpin()) return;

    const options = this.options();
    const frontlineMap = this.frontlineMap();
    const jobs = this.dealable();
    const reelItem = (c: Candidate) => this.reelItem(c);
    this.spinning.set(true);
    this.showResult.set(false);
    this.result.set(null);

    try {
      this.status.set('Choosing a duty type…');
      const type = options[pickIndex(options.length)];
      await this.typeReel().spinTo(this.typePreview(), typeItem(type.name, type.candidates.length));
      await wait(PAUSE_BETWEEN_REELS_MS);

      this.status.set(`${type.name}: choosing a duty…`);
      const candidate = type.candidates[pickIndex(type.candidates.length)];
      await this.dutyReel().spinTo(type.candidates.map(reelItem), reelItem(candidate));
      await wait(PAUSE_BETWEEN_REELS_MS);

      this.status.set(`${candidateName(candidate)}: choosing the party settings…`);
      const modes = runModes(candidate, type.name, jobs.length > 0);
      // The third reel now offers only what this duty allows.
      this.spunModes.set(modes);
      this.cdr.detectChanges();
      const mode = modes[pickIndex(modes.length)];
      await this.modeReel().spinTo(modes.map(modeItem), modeItem(mode));

      // Dealer's choice: after a moment, the reel deals the job.
      let job: Job | undefined;
      if (mode === DEALERS_CHOICE) {
        await wait(PAUSE_BEFORE_DEAL_MS);
        this.status.set('Dealing a job…');
        job = jobs[pickIndex(jobs.length)];
        await this.modeReel().dealWinner(
          jobs.map((j) => this.jobItem(j)),
          this.jobItem(job),
        );
      }
      await wait(PAUSE_BETWEEN_REELS_MS / 2);

      const result = this.toResult(type.name, candidate, mode, job, frontlineMap);
      this.result.set(result);
      this.status.set(`Duty found: ${result.name}, ${result.mode}.`);
      this.showResult.set(true);
    } finally {
      this.spinning.set(false);
    }
  }

  // An image the backend doesn't have yet is left out.
  hideImage(event: Event) {
    (event.target as HTMLElement).hidden = true;
  }

  closeResult() {
    this.showResult.set(false);
  }

  withdraw() {
    this.showResult.set(false);
    void this.commence();
  }

  // A dealt job on the third reel: "Everyone on the same job:" and its icon.
  private jobItem(job: Job): ReelItem {
    return { title: `${SAME_JOB}:`, detail: job.name, icon: this.dutiesService.imageUrl(job.icon) };
  }

  private toResult(
    type: string,
    candidate: Candidate,
    mode: RunMode,
    job: Job | undefined,
    frontlineMap: string | null,
  ): RouletteResult {
    const image = candidate.kind === 'duty' ? candidate.duty.image : candidate.roulette.image;
    // Awktrail links the duty's gear set, when the community sheet has one.
    const guideUrl = mode === 'Awktrail' && candidate.kind === 'duty' ? awktrailGuideUrl(candidate.duty.name) : null;
    return {
      ...describe(type, candidate, frontlineMap),
      mode: job ? `${SAME_JOB}: ${job.name}` : mode,
      job: job && { name: job.name, icon: this.dutiesService.imageUrl(job.icon) },
      image: this.dutiesService.imageUrl(image),
      guide: guideUrl ? { label: 'Awktrail gear set', url: guideUrl } : undefined,
    };
  }

  private updateSettings(change: (s: RouletteSettings) => RouletteSettings) {
    const settings = change(this.settings());
    this.settings.set(settings);
    this.spunModes.set(null);
    saveSettings(settings);
  }
}

// A duty type on the first reel, with how many duties it can land on.
function typeItem(name: string, count: number): ReelItem {
  return { title: name, detail: `${count} to pick from` };
}

// A party setting on the third reel, with what it means.
function modeItem(mode: RunMode): ReelItem {
  return { title: mode, detail: runModeDetail(mode) };
}

function toggled<T>(list: T[], item: T, on: boolean) {
  const without = list.filter((x) => x !== item);
  return on ? [...without, item] : without;
}

// What the result says about the duty.
function describe(type: string, candidate: Candidate, frontlineMap: string | null) {
  const detail = candidateDetail(candidate, frontlineMap);
  if (candidate.kind === 'roulette') {
    // The game picks the duty, except for today's known Frontline map.
    const known = detail.startsWith('Today:');
    return {
      type,
      name: candidate.roulette.name,
      detail: known ? detail : [candidate.roulette.dutyType, 'the game picks the duty'].filter(Boolean).join(' · '),
      dutyUnknown: !known,
    };
  }
  return { type, name: candidate.duty.name, detail, dutyUnknown: false };
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
