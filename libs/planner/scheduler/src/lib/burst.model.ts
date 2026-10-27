// A buff or enabler a job's guides use on cooldown after the opener: every
// `everyMs` (its recast unless said), from the opener's use of it, or from
// the first GCD without one.
export interface BurstAction {
  action: number;
  everyMs?: number;
}
