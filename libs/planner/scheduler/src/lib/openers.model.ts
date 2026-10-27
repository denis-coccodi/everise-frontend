// An opener a replanned player can start the pull with (see OPENERS):
// "none" has no opener, the plan placing what it needs.
export type OpenerId = 'standard' | 'dissipation-first' | 'none';

export interface OpenerPreset {
  id: OpenerId;
  name: string;
  // Where it comes from, for the page to say.
  source: string;
  steps: { action: number; afterGcd: number }[];
}
