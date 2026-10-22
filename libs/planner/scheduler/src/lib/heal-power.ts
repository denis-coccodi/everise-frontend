import { ActionCatalog, PullTimeline } from '@everise/core/api-types';
import { buffedAsPlayed, healingBuffsOf } from './healing-buffs';

// What one potency of healing restored for each player in the pull: the
// lower quarter of their direct heals' HP over their potency, which leaves
// out most critical heals, from heals no healing buff was up for (the plan
// multiplies them in where it has them up). Players with no such heals
// take the median of their role's (healers, or everyone else), then of
// the party.
export function healPower(timeline: PullTimeline, catalog: ActionCatalog): Map<number, number> {
  const potency = new Map<number, number>();
  for (const action of catalog.actions) {
    const heal = action.effects.find((e) => e.kind === 'heal' && e.potency && !e.condition);
    if (heal?.potency) potency.set(action.id, heal.potency);
  }
  const buffed = buffedAsPlayed(healingBuffsOf(catalog, true), timeline);
  const samples = new Map<number, number[]>();
  for (const heal of timeline.heals) {
    if (heal.tick || heal.source === null || heal.action === null || heal.pet) continue;
    if (buffed(heal.source, heal.target, heal.at)) continue;
    const per = potency.get(heal.action);
    if (!per) continue;
    samples.set(heal.source, [...(samples.get(heal.source) ?? []), (heal.amount + heal.overheal) / per]);
  }
  const own = new Map([...samples].map(([player, values]) => [player, quantile(values, 0.25)]));
  const healer = (id: number) => timeline.players.find((p) => p.id === id)?.role === 'healer';
  const roleMedian = (healers: boolean) => {
    const values = [...own].filter(([id]) => healer(id) === healers).map(([, v]) => v);
    return values.length ? quantile(values, 0.5) : null;
  };
  const party = own.size ? quantile([...own.values()], 0.5) : null;
  const power = new Map<number, number>();
  for (const player of timeline.players) {
    const value = own.get(player.id) ?? roleMedian(player.role === 'healer') ?? party;
    if (value) power.set(player.id, value);
  }
  return power;
}

function quantile(values: number[], q: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
}
