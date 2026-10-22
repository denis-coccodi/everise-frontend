// A status that makes heals bigger: what its holder's healing magic heals
// (`potency`: spells only, as Temperance's), or what its holder receives
// (`received`: any heal, as Rampart's).
export interface HealingBuff {
  action: number;
  kind: 'potency' | 'received';
  target: 'self' | 'target' | 'party';
  // 0.2: heals 20% more.
  share: number;
  durationMs: number;
  // The status, as the game names it (two of one name don't stack) and
  // numbers it; null when the catalog doesn't say.
  status: string;
  statusId: number | null;
}

// A buff on one player for a while.
export interface BuffSpan {
  player: number;
  buff: HealingBuff;
  from: number;
  to: number;
}
