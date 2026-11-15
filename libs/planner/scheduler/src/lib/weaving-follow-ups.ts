import { ActionCatalog, PullTimeline } from '@everise/core/api-types';

// A GCD's follow-up shows in the log this soon after it, under its name.
const FOLLOW_UP_MS = 1_500;

// A player's casts without the follow-ups the log has of a GCD: a non-GCD
// of the same name, by its own id, soon after (Pneuma's heal, Star Prism's,
// Technical Finish's). Nobody pressed them, so they take no weave slot.
export function withoutFollowUps(casts: PullTimeline['playerCasts'], catalog: ActionCatalog) {
  const byId = new Map(catalog.actions.map((a) => [a.id, a]));
  const lastGcd = new Map<number, { at: number; name: string }>();
  return [...casts]
    .sort((a, b) => a.at - b.at)
    .filter((cast) => {
      const action = byId.get(cast.action);
      if (action?.gcd) lastGcd.set(cast.source, { at: cast.at, name: action.name });
      const last = lastGcd.get(cast.source);
      return !(action && !action.gcd && last?.name === action.name && cast.at - last.at <= FOLLOW_UP_MS);
    });
}
