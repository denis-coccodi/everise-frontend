// A player's resource some actions spend one of: it fills one every
// `gainMs`, up to `max`, and starts full (a white mage's lilies too, since
// 7.4).
export interface ToolPool {
  name: string;
  gainMs: number;
  max: number;
  // A pool that fills only at these moments, to `max` (Aetherflow and
  // Dissipation's stacks), from empty: `gainMs` is then how often it comes.
  refills?: number[];
  // A pool that starts empty and gains one only at these moments, not with
  // time (the Faerie Gauge, from the Aetherflow spent).
  earned?: number[];
  // One more at each of these moments, up to `max` (Rhizomata's
  // Addersgall).
  bonus?: number[];
}
