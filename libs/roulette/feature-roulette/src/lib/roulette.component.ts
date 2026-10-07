import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@everise/auth/data-access';
import { Job, RoulettePostRequest } from '@everise/core/api-types';
import {
  Candidate,
  DEALERS_CHOICE,
  RouletteStore,
  candidateName,
  pickIndex,
  runModes,
  spreadSample,
} from '@everise/roulette/data-access';
import { ButtonComponent, MessageComponent, PanelComponent } from '@everise/ui/components';
import { DutyFoundComponent, RouletteResult } from './duty-found/duty-found.component';
import { wait } from './motion';
import { ReelComponent, ReelItem } from './reel/reel.component';
import { Day, bannerOf, dutyItem, jobItem, modeItem, toResult, typeItem } from './reel-items';
import { RoulettePicksComponent } from './roulette-picks/roulette-picks.component';
import { RouletteSettingsComponent } from './roulette-settings/roulette-settings.component';

const PAUSE_BETWEEN_REELS_MS = 600;
// The pause between landing on dealer's choice and dealing the job.
const PAUSE_BEFORE_DEAL_MS = 500;
// Most outcomes the idle duty reel previews.
const REEL_PREVIEW_MAX = 60;

// The Duty Roulette page: three reels pick the duty type, the duty and the
// party settings, then the "Duty Found" window offers to post the result.
// What the reels can land on, and the Duty Finder settings, are the
// RouletteStore's; this spins the reels and shows the result.
@Component({
  selector: 'cdt-roulette',
  templateUrl: './roulette.component.html',
  styleUrl: './roulette.component.scss',
  imports: [
    ButtonComponent,
    DutyFoundComponent,
    PanelComponent,
    ReelComponent,
    RouletteSettingsComponent,
    RoulettePicksComponent,
    RouterLink,
    MessageComponent,
  ],
  providers: [RouletteStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouletteComponent {
  protected readonly store = inject(RouletteStore);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly signedIn = inject(AuthStore).loggedIn;

  private readonly typeReel = viewChild.required<ReelComponent>('typeReel');
  private readonly dutyReel = viewChild.required<ReelComponent>('dutyReel');
  private readonly modeReel = viewChild.required<ReelComponent>('modeReel');
  // The Commence / Spin again button: the focus goes back to it when the
  // "Duty Found" window closes (it was disabled while spinning, so the
  // window can't give the focus back by itself).
  private readonly spinButton = viewChild('spinButton', { read: ElementRef<HTMLButtonElement> });

  readonly spinning = signal(false);
  readonly status = signal('');
  // The "Pause animations" button: stops the idle reels and the crystal.
  readonly motionPaused = signal(false);
  readonly result = signal<RouletteResult | null>(null);
  readonly showResult = signal(false);
  // What the reels landed on, as ids, for posting.
  private lastSpin: RoulettePostRequest['result'] | null = null;

  readonly canSpin = computed(() => this.store.ready() && !this.spinning());

  // What each reel shows before a spin: everything it can land on.
  readonly typePreview = computed(() =>
    this.store.options().map((o) => typeItem(o.name, o.candidates.length, this.store.typeIcons().get(o.name))),
  );
  // The duties of the allowed types, in their order, sampled across all of
  // them when there are many.
  readonly dutyPreview = computed(() =>
    spreadSample(
      this.store.options().flatMap((o) => o.candidates.map((c) => this.dutyItem(c, o.name))),
      REEL_PREVIEW_MAX,
    ),
  );
  readonly modePreview = computed(() => this.store.modes().map(modeItem));

  constructor() {
    // Once the result is posted, the window closes.
    effect(() => {
      if (!this.store.posted()) return;
      untracked(() => {
        this.showResult.set(false);
        this.spinButton()?.nativeElement.focus();
        this.status.set(this.signedIn() ? 'Posted to the feed.' : 'Tataru posted it to the feed for you.');
      });
    });
  }

  // Spins the three reels one after the other, then shows the result.
  async commence() {
    if (!this.canSpin()) return;

    const options = this.store.options();
    const day = this.day();
    const jobs = this.store.dealable();
    this.spinning.set(true);
    this.showResult.set(false);
    this.result.set(null);

    try {
      this.status.set('Choosing a duty type…');
      const type = options[pickIndex(options.length)];
      const typeIcon = this.store.typeIcons().get(type.name);
      await this.typeReel().spinTo(this.typePreview(), typeItem(type.name, type.candidates.length, typeIcon));
      await wait(PAUSE_BETWEEN_REELS_MS);

      this.status.set(`${type.name}: choosing a duty…`);
      const candidate = type.candidates[pickIndex(type.candidates.length)];
      await this.dutyReel().spinTo(
        type.candidates.map((c) => this.dutyItem(c, type.name)),
        dutyItem(candidate, day, typeIcon, this.store.imageUrl(bannerOf(candidate))),
      );
      await wait(PAUSE_BETWEEN_REELS_MS);

      this.status.set(`${candidateName(candidate)}: choosing the party settings…`);
      const modes = runModes(candidate, type.name, jobs.length > 0);
      // The third reel now offers only what this duty allows.
      this.store.setSpunModes(modes);
      this.cdr.detectChanges();
      const mode = modes[pickIndex(modes.length)];
      await this.modeReel().spinTo(modes.map(modeItem), modeItem(mode));

      // Dealer's choice: after a moment, the reel deals the job.
      let job: Job | undefined;
      if (mode === DEALERS_CHOICE) {
        await wait(PAUSE_BEFORE_DEAL_MS);
        this.status.set('Dealing a job…');
        job = jobs[pickIndex(jobs.length)];
        const imageUrl = this.store.imageUrl;
        await this.modeReel().dealWinner(
          jobs.map((j) => jobItem(j, imageUrl)),
          jobItem(job, imageUrl),
        );
      }
      await wait(PAUSE_BETWEEN_REELS_MS / 2);

      const result = toResult(type.name, candidate, mode, job, day, this.store.imageUrl);
      this.result.set(result);
      this.lastSpin = {
        type: type.name,
        candidate: toSpunCandidate(candidate),
        mode,
        ...(job ? { jobId: job.id } : {}),
      };
      this.store.clearPost();
      this.status.set(`Duty found: ${result.name}, ${result.mode}.`);
      this.showResult.set(true);
    } finally {
      this.spinning.set(false);
    }
  }

  // Closing the window keeps the result to oneself.
  closeResult() {
    this.showResult.set(false);
    this.spinButton()?.nativeElement.focus();
  }

  // Commence in the window: posts the result to the feeds (a guest's is
  // posted by Tataru; the backend checks it and builds the card).
  accept(comment: string) {
    if (!this.lastSpin || this.store.posting()) return;
    this.store.post({ result: this.lastSpin, ...(this.signedIn() && comment ? { comment } : {}) });
  }

  withdraw() {
    this.showResult.set(false);
    this.store.clearPost();
    void this.commence();
  }

  private day(): Day {
    return { frontlineMap: this.store.frontlineMap(), changesAt: this.store.frontlineChangesAt() };
  }

  private dutyItem(candidate: Candidate, type: string): ReelItem {
    return dutyItem(candidate, this.day(), this.store.typeIcons().get(type));
  }
}

function toSpunCandidate(candidate: Candidate): RoulettePostRequest['result']['candidate'] {
  return candidate.kind === 'duty'
    ? { kind: 'duty', id: candidate.duty.id }
    : { kind: 'roulette', id: candidate.roulette.id };
}
