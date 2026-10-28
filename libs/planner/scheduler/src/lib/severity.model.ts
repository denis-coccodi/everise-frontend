// How hard a boss attack hits, for how much mitigation it calls for: by its
// damage before any mitigation, as a share of the max HP of each player it
// hits.
export type SeverityTier = 'light' | 'moderate' | 'heavy' | 'lethal' | 'overkill';

export interface Severity {
  tier: SeverityTier;
  // A raidwide, a tank buster, or one on some players (a stack, a spread).
  kind: 'raidwide' | 'tankbuster' | 'targeted';
  // The median of its hits' unmitigated damage, as a share of max HP.
  share: number;
}
