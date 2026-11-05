import type { PullTimeline } from '@everise/core/api-types';

// An auto-attack's name in the game's client languages. Some bosses'
// auto-attacks are "攻撃" in every language: the game never translated them.
const AUTO_ATTACK = /^(attack|attaque|attacke|攻撃)$/i;
// What FFLogs calls an ability the game has no name for.
const UNNAMED = /^unknown_[0-9a-f]+$/i;
// An unnamed attack on (nearly) nobody but the tanks, again every few
// seconds (a tank buster comes every 30 seconds or more), is another of the
// boss's auto-attacks: Pandora's, in Futures Rewritten, hits both tanks
// every 3. Nearly: one in the boss's cleave can catch another player.
const AUTO_ATTACK_TIMES = 3;
const AUTO_ATTACK_EVERY_MS = 8_000;
const ON_TANKS = 0.9;
const SAME_MOMENT_MS = 500;

// The pull with its attacks named for people: every auto-attack "Attack"
// (which the planner leaves out of the mechanics), and any other attack the
// game has no name for "Unnamed attack (9CB3)", by its id in hex as fight
// guides and timelines write it.
export function withAttackNames(timeline: PullTimeline): PullTimeline {
  const tanks = new Set(timeline.players.filter((p) => p.role === 'tank').map((p) => p.id));
  const autoAttack = (id: number) => {
    const hits = timeline.damage.filter((h) => h.action === id && !h.tick);
    const moments = hits.map((h) => h.at).filter((at, i, all) => i === 0 || at - all[i - 1] >= SAME_MOMENT_MS);
    const gaps = moments
      .slice(1)
      .map((at, i) => at - moments[i])
      .sort((a, b) => a - b);
    const usualGap = gaps[gaps.length >> 1] ?? Infinity;
    const onTanks = hits.filter((h) => tanks.has(h.target)).length;
    return moments.length >= AUTO_ATTACK_TIMES && usualGap <= AUTO_ATTACK_EVERY_MS && onTanks >= ON_TANKS * hits.length;
  };
  const actions = timeline.actions.map((action) => {
    if (AUTO_ATTACK.test(action.name)) return { ...action, name: 'Attack' };
    if (!UNNAMED.test(action.name) && action.name !== '') return action;
    const name = autoAttack(action.id) ? 'Attack' : `Unnamed attack (${action.id.toString(16).toUpperCase()})`;
    return { ...action, name };
  });
  return { ...timeline, actions };
}
