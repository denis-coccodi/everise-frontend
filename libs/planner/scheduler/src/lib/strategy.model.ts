// A way the plan is made, one of several tried per pull (`STRATEGIES`): no
// one rule suits every fight, so each is a choice the best plan makes.
export interface Strategy {
  // A party mitigation waits for a mechanic taking the party much more
  // within its recast (Dancing Mad's last raidwides, nothing else left).
  partyWaits?: boolean;
  // Big heals go where they're needed first, and Macrocosmos counts as the
  // damage spell it is (DSR's Gigaflare's Edges, three in 8s).
  healsFirstNeed?: boolean;
  // Tank busters a few seconds apart land on what the ones before left
  // (Dancing Mad's Flare, Chaotic Flare and Flare Diffusion).
  tankChains?: boolean;
}
