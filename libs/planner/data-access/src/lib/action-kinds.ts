import { CatalogAction } from '@everise/core/api-types';
import { ENABLERS } from '@everise/planner/scheduler';

// Items (potions, ethers) come in the log with ids from here up.
const ITEMS_FROM = 1_000_000;
const SPRINT = 3;
// A tooltip that starts like this is an attack's.
const ATTACK = /^(Deals|Delivers)\b/;

// Whether an action only deals damage, for the pull's log to leave out:
// an attack with no heal or mitigation of its own that enables none (a
// buff it gives itself, like Gekko's, doesn't count, nor MP it restores, like
// Syphon Strike's). Actions the catalog doesn't have are combo steps that
// replace another (Supplication, the Blades), so damage too, but for items,
// Sprint and the enablers.
export function onlyDamage(id: number, action: CatalogAction | undefined): boolean {
  if (id in ENABLERS || id >= ITEMS_FROM || id === SPRINT) return false;
  if (!action) return true;
  const own = action.effects.filter((e) => e.kind !== 'mp');
  return !own.length && ATTACK.test(action.description ?? '');
}

// What an action without heals or mitigations of its own does, in words:
// an enabler's, or its tooltip's first line ("Increases damage dealt by
// 25%.").
export function whatItDoes(id: number, action: CatalogAction | undefined): string {
  if (id >= ITEMS_FROM) return 'An item (a potion, an ether)';
  return ENABLERS[id] ?? action?.description?.split('\n')[0] ?? '';
}
