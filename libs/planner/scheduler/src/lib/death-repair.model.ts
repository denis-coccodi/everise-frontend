// A big cooldown kept for a death (`repairDeaths`): not used from `from` to
// `to` (ms from the pull's start), where it would still be recasting when
// the death's hit lands, so it's up for that hit.
export interface Hold {
  player: number;
  action: number;
  from: number;
  to: number;
}
