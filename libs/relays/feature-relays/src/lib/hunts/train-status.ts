import { relativeTime } from '../discord-times';

// How long the backend counts a train as running after it starts.
const RUNNING_MS = 2 * 60 * 60 * 1000;

export type TrainState = 'upcoming' | 'running' | 'past';

// Where a train is at: to come, running (started under 2 hours ago), or
// the last one that started, and the words for it.
export function trainStatus(startsAt: string, now: number): { state: TrainState; label: string } {
  const at = Date.parse(startsAt);
  const when = relativeTime(at, now);
  if (at > now) return { state: 'upcoming', label: `Starts ${when}` };
  if (now - at < RUNNING_MS) return { state: 'running', label: `Running · started ${when}` };
  return { state: 'past', label: `Last train · started ${when}` };
}
