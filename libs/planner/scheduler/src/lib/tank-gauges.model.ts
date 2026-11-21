// A cast that counts for a tank's gauge (`tank-gauges.ts`).
export interface GaugeCast {
  action: number;
  at: number;
  // The plan's own: it gets the gauge first.
  own: boolean;
}
