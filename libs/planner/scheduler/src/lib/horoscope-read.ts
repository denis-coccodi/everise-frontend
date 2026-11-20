import { HOROSCOPE } from './heal-tools';
import type { Candidate, Spent } from './heal-plan.model';
import type { PlannedUse } from './plan.model';
import type { Weaving } from './weaving';

// How soon after its moment Horoscope is read at the latest.
const READ_MS = 5_000;

// Horoscope Helios heals when read: Horoscope pressed again, in the first
// weave slot from when its heal was counted (`readAt`: right after the next
// hit, or as it runs out), none when there's no slot in time; added to the
// `uses` and `spent` so far. It covers no hit itself: it heals what they did.
export function readHoroscope(pick: Candidate, uses: PlannedUse[], spent: Spent[], weaving: Weaving) {
  if (pick.paired?.pairing.action !== HOROSCOPE) return;
  const { player } = pick.use;
  const from = pick.paired.readAt ?? pick.use.at + pick.tool.castMs;
  const read = weaving.ogcdAfter(
    player,
    from,
    from + READ_MS,
    spent.filter((s) => s.player === player),
  );
  if (read === null) return;
  uses.push({ ...pick.paired.use, at: read, target: null, covers: [], again: 'horoscope' });
  spent.push({ player, action: HOROSCOPE, at: read, group: `read:${player}`, pool: null, gcd: false, castMs: 0 });
}
