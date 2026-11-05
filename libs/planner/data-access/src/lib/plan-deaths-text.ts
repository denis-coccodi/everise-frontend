import type { PullTimeline } from '@everise/core/api-types';
import type { Plan } from '@everise/planner/scheduler';
import { pullClock } from './pull-time';

// The deaths the plan couldn't prevent, in words for its summary: who dies
// to what and when, and who raises them when (Swiftcast or not), or that
// nobody can; and what a death costs. Empty when nobody dies.
export function deathsText(plan: Plan, players: PullTimeline['players']): string {
  const deaths = plan.deaths ?? [];
  if (!deaths.length) return '';
  const who = (id: number | null) => {
    const p = players.find((x) => x.id === id);
    return p ? `${p.name}${p.job ? ` (${p.job})` : ''}` : 'someone';
  };
  const mechanic = new Map(plan.mechanics.map((m) => [m.id, m.name]));
  const each = deaths.map((d) => {
    const died = `${who(d.player)} to ${mechanic.get(d.mechanic) ?? 'a hit'} at ${pullClock(d.at)}`;
    if (d.raisedBy === null || d.raisedAt === null) return `${died}, and nobody can raise them`;
    const raise = plan.uses.find((u) => u.raise && u.player === d.raisedBy && u.target === d.player && u.at >= d.at);
    const swift = plan.uses.some(
      (u) => u.raise && u.action === 7561 && u.player === d.raisedBy && raise && Math.abs(u.at - raise.at) < 1_000,
    );
    return `${died}, raised by ${who(d.raisedBy)}'s ${swift ? 'Swiftcast ' : ''}${raise?.name ?? 'raise'} at ${pullClock(raise?.at ?? d.raisedAt)}`;
  });
  const n = deaths.length;
  return (
    ` ${n === 1 ? 'One player still dies' : `${n} players still die`}, which nothing the plan has can prevent: ${each.join('; ')}.` +
    ' A death costs most of that player’s damage until they’re back, and 25% of it for about 100 s after (Weakness): a DPS check likely fails.'
  );
}
