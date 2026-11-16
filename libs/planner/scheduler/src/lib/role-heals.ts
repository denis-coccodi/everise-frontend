// The heals the plan has a DPS or a tank use when it replans them (a
// healer's are all theirs).

// A DPS's that cost no damage: Second Wind, Curing Waltz, Lux Solaris,
// Earth's Reply. (Vercure and Physick would take a damage GCD; Improvisation
// stops them to dance; Star Prism is a damage spell of their burst, kept as
// played.)
export const DPS_HEALS = new Set([7541, 16015, 36997, 36944]);
// Second Wind: a DPS saving themselves where a healer would be too late, not
// a heal for the healers to count on. Planned last (`self`), never to refill.
export const SECOND_WIND = 7541;

// A tank's own oGCD heals, which players use a lot (in 63 kills' logs, 6.5
// Equilibriums a warrior and 7.1 Auroras a gunbreaker each kill): Equilibrium
// and Aurora. Thrill of Battle (more max HP and healing received) stays a
// healing buff as played; Clemency would take a damage GCD.
export const TANK_HEALS = new Set([3552, 16151]);

// Either's: the heal tools the heal step plans for someone not a healer.
export const ROLE_HEALS = new Set([...DPS_HEALS, ...TANK_HEALS]);

// Whether `action` is one of the heals the plan has a player of `role` use.
export function roleHeal(role: string | null | undefined, action: number): boolean {
  if (role === 'healer') return true;
  return (role === 'tank' ? TANK_HEALS : DPS_HEALS).has(action);
}
