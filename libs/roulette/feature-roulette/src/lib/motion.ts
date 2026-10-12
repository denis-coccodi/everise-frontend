// Animation helpers and timings shared by the reels and the page.

// The pause between one reel landing and the next starting.
export const PAUSE_BETWEEN_REELS_MS = 600;
// The pause between landing on dealer's choice and dealing the job.
export const PAUSE_BEFORE_DEAL_MS = 500;
// Most outcomes the idle duty reel previews.
export const REEL_PREVIEW_MAX = 60;

export function reducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
