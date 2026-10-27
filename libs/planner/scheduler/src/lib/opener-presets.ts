import { AETHERFLOW, DISSIPATION } from './aetherflow';
import type { OpenerPreset, OpenerStep } from './openers.model';

// The openers of each job's guides at level 100, by job. Each says where it
// comes from; a patch that changes one needs it changed here.

export const ENERGY_DRAIN = 167;
export const UMBRAL_DRAW = 37018;
export const AFFLATUS_MISERY = 16535;
const NONE: OpenerPreset = { id: 'none', name: 'None: planned without an opener', source: '', steps: [] };

// Scholar: precast Broil IV, Biolysis, then the first stacks, Chain
// Stratagem on the second GCD, three Energy Drains, the other stacks,
// Baneful Impaction and three more Energy Drains.
const SCHOLAR_SOURCE = 'Icy Veins (7.55), The Balance (7.4)';
const scholarOpener = (first: number, second: number): OpenerStep[] => [
  { action: first, afterGcd: 1 },
  { action: 7436, afterGcd: 2 }, // Chain Stratagem
  { action: ENERGY_DRAIN, afterGcd: 3 },
  { action: ENERGY_DRAIN, afterGcd: 4 },
  { action: ENERGY_DRAIN, afterGcd: 5 },
  { action: second, afterGcd: 6 },
  { action: 37012, afterGcd: 7 }, // Baneful Impaction
  { action: ENERGY_DRAIN, afterGcd: 8 },
  { action: ENERGY_DRAIN, afterGcd: 9 },
  { action: ENERGY_DRAIN, afterGcd: 10 },
];

// White Mage: precast Glare III, Dia, two Glare III, Presence of Mind,
// Glare IV and Assize, Afflatus Misery, then Glare IV and Glare III to the
// Dia refresh; the Double Misery opener spends the three lilies (Afflatus
// Rapture) for a second Misery.
const WHITE_MAGE_SOURCE = 'Icy Veins (7.55), The Balance (7.4)';
const whiteMageOpener: OpenerStep[] = [
  { action: 136, afterGcd: 3 }, // Presence of Mind
  { action: 3571, afterGcd: 4 }, // Assize
  { action: AFFLATUS_MISERY, gcd: 5 },
];

export const OPENERS: Record<string, OpenerPreset[]> = {
  SCH: [
    {
      id: 'standard',
      name: 'Aetherflow first',
      source: SCHOLAR_SOURCE,
      steps: scholarOpener(AETHERFLOW, DISSIPATION),
    },
    {
      id: 'dissipation-first',
      name: 'Dissipation first',
      source: SCHOLAR_SOURCE,
      steps: scholarOpener(DISSIPATION, AETHERFLOW),
    },
    NONE,
  ],
  // Astrologian: Earthly Star in the countdown, precast Fall Malefic,
  // Combust III, Lightspeed, Divination with the Balance (from the Astral
  // Draw before the pull), Lord of Crowns and Umbral Draw, the Spear and
  // Oracle.
  AST: [
    {
      id: 'standard',
      name: 'Standard',
      source: 'Icy Veins (7.55), The Balance (7.01)',
      steps: [
        { action: 7439, at: -4_000 }, // Earthly Star
        { action: 3606, afterGcd: 1 }, // Lightspeed
        { action: 16552, afterGcd: 3 }, // Divination
        { action: 37023, name: 'the Balance', afterGcd: 3 },
        { action: 7444, name: 'Lord of Crowns', afterGcd: 4 },
        { action: UMBRAL_DRAW, name: 'Umbral Draw', afterGcd: 4 },
        { action: 37026, name: 'the Spear', afterGcd: 5 },
        { action: 37029, afterGcd: 5 }, // Oracle
      ],
    },
    { ...NONE, steps: [{ action: UMBRAL_DRAW, name: 'Umbral Draw', afterGcd: 1 }] },
  ],
  WHM: [
    { id: 'standard', name: 'Standard', source: WHITE_MAGE_SOURCE, steps: whiteMageOpener },
    {
      id: 'double-misery',
      name: 'Double Misery',
      source: WHITE_MAGE_SOURCE,
      steps: [
        ...whiteMageOpener,
        { action: 16534, gcd: 8 }, // Afflatus Rapture
        { action: 16534, gcd: 9 },
        { action: 16534, gcd: 10 },
        { action: AFFLATUS_MISERY, gcd: 11 },
      ],
    },
    NONE,
  ],
  // Sage: Eukrasia in the countdown, precast Toxikon II (or Pneuma),
  // Eukrasian Dosis III, three Dosis III, both Phlegma III with Psyche
  // after the first.
  SGE: [
    {
      id: 'standard',
      name: 'Standard: Toxikon',
      source: 'Icy Veins (7.55), The Balance (7.0)',
      steps: [{ action: 37033, afterGcd: 5 }], // Psyche
    },
    {
      id: 'pneuma',
      name: 'Pneuma',
      source: 'The Balance (7.0)',
      steps: [
        { action: 24318, gcd: 0 }, // Pneuma, precast
        { action: 37033, afterGcd: 5 },
      ],
    },
    NONE,
  ],
  // The tanks' openers, their buffs and enablers only (the rest is damage).
  // Paladin: precast Holy Spirit, Fast Blade, Riot Blade, Royal Authority
  // and Fight or Flight with Imperator, then Confiteor and the Blades.
  PLD: [
    { id: 'standard', name: 'Standard', source: 'Icy Veins (7.55)', steps: [{ action: 20, afterGcd: 3 }] }, // Fight or Flight
    NONE,
  ],
  // Warrior: precast Tomahawk and Infuriate, Heavy Swing, Maim, Storm's Eye
  // and Inner Release, Inner Chaos, Primal Rend, Primal Ruination, three
  // Fell Cleaves and another Infuriate, a combo, and the third Infuriate.
  WAR: [
    {
      id: 'standard',
      name: 'Standard',
      source: 'Icy Veins (7.55)',
      steps: [
        { action: 52, afterGcd: 0 }, // Infuriate
        { action: 7389, afterGcd: 3 }, // Inner Release
        { action: 52, afterGcd: 9 },
        { action: 52, afterGcd: 14 },
      ],
    },
    NONE,
  ],
  // Dark Knight: The Blackest Night at -3s (for the boss's first autos),
  // precast Unmend, Hard Slash with Living Shadow, Syphon Strike, Souleater
  // and Delirium, then its GCDs.
  DRK: [
    {
      id: 'standard',
      name: 'Standard',
      source: 'Icy Veins (7.4)',
      steps: [
        { action: 7393, at: -3_000 }, // The Blackest Night
        { action: 7390, afterGcd: 3 }, // Delirium
      ],
    },
    NONE,
  ],
  // Gunbreaker: precast Lightning Shot and Bloodfest, Keen Edge, Brutal
  // Shell and No Mercy (after the potion), then Gnashing Fang and Double
  // Down.
  GNB: [
    {
      id: 'standard',
      name: 'Standard',
      source: 'Icy Veins (7.55)',
      steps: [
        { action: 16164, afterGcd: 0 }, // Bloodfest
        { action: 16138, afterGcd: 2 }, // No Mercy
      ],
    },
    NONE,
  ],
};
