import { HOROSCOPE } from './heal-tools';
import type { Candidate, Spent } from './heal-plan.model';
import type { PlannedUse } from './plan.model';
import type { Weaving } from './weaving';

// How soon after its Helios lands Horoscope is read at the latest.
const READ_MS = 5_000;

// Horoscope Helios heals when read: Horoscope pressed again, as the Helios
// lands, in the first weave slot after (none when there's no slot in time),
// added to the `uses` and `spent` so far.
export function readHoroscope(pick: Candidate, uses: PlannedUse[], spent: Spent[], weaving: Weaving) {
  if (pick.paired?.pairing.action !== HOROSCOPE) return;
  const { player } = pick.use;
  const lands = pick.use.at + pick.tool.castMs;
  const read = weaving.ogcdAfter(
    player,
    lands,
    lands + READ_MS,
    spent.filter((s) => s.player === player),
  );
  if (read === null) return;
  uses.push({ ...pick.paired.use, at: read, target: null, again: 'horoscope' });
  spent.push({ player, action: HOROSCOPE, at: read, group: `read:${player}`, pool: null, gcd: false, castMs: 0 });
}
