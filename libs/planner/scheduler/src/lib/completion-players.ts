import type { PullTimeline } from '@everise/core/api-types';
import type { StandIns } from './completion.model';

type Player = PullTimeline['players'][number];

// Who in another group's kill (`clear`) stands in for whom in the wipe's
// group, the closest match first: the same job, then the same role, then
// the same kind (tank, healer, DPS), then whoever's left. The kill's
// attacks are taken as they hit there: the game sets their damage, so
// groups take the same (within a few percent on real kills).
export function standIns(wipe: PullTimeline, clear: PullTimeline): StandIns {
  const out: StandIns = {};
  const free = new Set(wipe.players.map((p) => p.id));
  const steps: [(a: Player, b: Player) => boolean, boolean][] = [
    [(a, b) => !!a.job && a.job === b.job, true],
    [(a, b) => !!a.role && a.role === b.role, false],
    [(a, b) => kindOf(a) === kindOf(b), false],
    [() => true, false],
  ];
  for (const [matches, sameJob] of steps)
    for (const theirs of clear.players) {
      if (out[theirs.id]) continue;
      const ours = wipe.players.find((p) => free.has(p.id) && matches(p, theirs));
      if (!ours) continue;
      free.delete(ours.id);
      out[theirs.id] = { player: ours.id, sameJob };
    }
  return out;
}

function kindOf(player: Player) {
  return player.role === 'tank' || player.role === 'healer' ? player.role : 'dps';
}
