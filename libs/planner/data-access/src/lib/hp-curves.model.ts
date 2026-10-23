// A point on a player's HP over the pull: when, and their HP after it as a
// share of their max HP.
export interface HpPoint {
  at: number;
  share: number;
}

// A moment marked on a player's HP: a death as played, a hit the plan leaves
// short of the margin, or a failed mechanic it takes as avoided.
export interface HpMark {
  at: number;
  share: number;
  kind: 'death' | 'short' | 'avoided';
  // The attack, for the hits.
  action: string | null;
}

// One player's HP over the pull, as played and with the plan (null before
// it's planned).
export interface HpCurve {
  id: number;
  name: string;
  job: string | null;
  played: HpPoint[];
  planned: HpPoint[] | null;
  marks: HpMark[];
}
