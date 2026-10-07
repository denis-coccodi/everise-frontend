import { Job, RoulettePostRequest } from '@everise/core/api-types';
import {
  Candidate,
  RunMode,
  SAME_JOB,
  awktrailGuideUrl,
  candidateDetail,
  candidateName,
  runModeDetail,
  wikiUrl,
} from '@everise/roulette/data-access';
import { RouletteResult } from './duty-found/duty-found.component';
import { ReelItem } from './reel/reel.component';

// What the reels and the "Duty Found" window show, from the roulette's data.
// Images are addresses (DutiesService.imageUrl).
type ImageUrl = (id: number | null | undefined) => string | undefined;

// The day's Frontline map and when it changes, for duty details.
export interface Day {
  frontlineMap: string | null;
  changesAt: string | null;
}

// A duty type on the first reel, with its icon and how many duties it can
// land on.
export function typeItem(name: string, count: number, icon: string | undefined): ReelItem {
  return { title: name, detail: `${count} to pick from`, thumb: icon };
}

// A duty on the second reel, with its type's icon: the rows share a few
// small images. `banner` (the winner's) makes a spin load one.
export function dutyItem(candidate: Candidate, day: Day, typeIcon: string | undefined, banner?: string): ReelItem {
  return {
    title: candidateName(candidate),
    detail: candidateDetail(candidate, day.frontlineMap, day.changesAt),
    thumb: typeIcon,
    backdrop: banner,
  };
}

// A party setting on the third reel, with what it means.
export function modeItem(mode: RunMode): ReelItem {
  return { title: mode, detail: runModeDetail(mode) };
}

// A dealt job on the third reel: "Everyone on the same job:" and its icon.
export function jobItem(job: Job, imageUrl: ImageUrl): ReelItem {
  return { title: `${SAME_JOB}:`, detail: job.name, icon: imageUrl(job.icon) };
}

// The duty's or roulette's banner image id.
export function bannerOf(candidate: Candidate) {
  return candidate.kind === 'duty' ? candidate.duty.image : candidate.roulette.image;
}

// The "Duty Found" window's contents.
export function toResult(
  type: string,
  candidate: Candidate,
  mode: RunMode,
  job: Job | undefined,
  day: Day,
  imageUrl: ImageUrl,
): RouletteResult {
  // Awktrail links the duty's gear set, when the community sheet has one.
  const guideUrl = mode === 'Awktrail' && candidate.kind === 'duty' ? awktrailGuideUrl(candidate.duty.name) : null;
  return {
    ...describe(type, candidate, day),
    mode: job ? `${SAME_JOB}: ${job.name}` : mode,
    job: job && { name: job.name, icon: imageUrl(job.icon) },
    image: imageUrl(bannerOf(candidate)),
    wiki: wikiUrl(candidate),
    guide: guideUrl ? { label: 'Awktrail gear set', url: guideUrl } : undefined,
  };
}

// What the result says about the duty.
function describe(type: string, candidate: Candidate, day: Day) {
  const detail = candidateDetail(candidate, day.frontlineMap, day.changesAt);
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

// What the reels landed on, as the backend reads it (ids only).
export function toSpunCandidate(candidate: Candidate): RoulettePostRequest['result']['candidate'] {
  return candidate.kind === 'duty'
    ? { kind: 'duty', id: candidate.duty.id }
    : { kind: 'roulette', id: candidate.roulette.id };
}
