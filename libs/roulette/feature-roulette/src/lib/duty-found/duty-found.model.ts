// What Commence posts with the result: a signed-in member's comment, and
// whether to share it in the Everise Discord. Empty for a guest.
export interface Commence {
  comment?: string;
  shareToDiscord?: boolean;
}

export interface RouletteResult {
  type: string;
  name: string;
  // Level and item level, or the roulette's duty type.
  detail: string;
  mode: string;
  // True when the game picks the duty (a duty roulette).
  dutyUnknown: boolean;
  // The job dealt by dealer's choice.
  job?: { name: string; icon?: string };
  // The duty's or roulette's banner.
  image?: string;
  // The duty's or roulette's page on the community wiki.
  wiki: string;
  // Where to read up on the party setting, e.g. Awktrail's gear sets.
  guide?: { label: string; url: string };
}
