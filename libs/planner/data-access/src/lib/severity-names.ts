import type { Severity, SeverityTier } from '@everise/planner/scheduler';

// How hard an attack hits, in words, and what that calls for.
export const TIER_NAMES: Record<SeverityTier, string> = {
  light: 'Light',
  moderate: 'Moderate',
  heavy: 'Heavy',
  lethal: 'Lethal',
  overkill: 'Overkill',
};
export const TIER_HINTS: Record<SeverityTier, string> = {
  light: 'Healing covers it.',
  moderate: 'Some mitigation, or a heal after.',
  heavy: 'Party mitigation or a shield.',
  lethal: 'Kills without mitigation: stack it.',
  overkill: 'Stack everything, or an invulnerability.',
};
// Physical and magic mitigation each take off their share; nothing takes
// off special (unique) damage.
export const DAMAGE_NAMES: Record<NonNullable<Severity['damageType']>, string> = {
  physical: 'Physical',
  magic: 'Magic',
  unique: 'Special',
};
export const KIND_NAMES: Record<Severity['kind'], string> = {
  raidwide: 'Raidwide',
  tankbuster: 'Tank buster',
  targeted: 'Targeted',
};
