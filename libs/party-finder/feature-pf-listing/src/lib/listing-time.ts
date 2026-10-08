// How long a listing has left, and how long ago something happened, in the
// words the page shows.

// A shared listing in the feeds is kept after its time ran out: "ended".
export function timeLeft(expiresAt: string, now: number) {
  const left = Date.parse(expiresAt) - now;
  if (left <= 0) return 'ended';
  const minutes = Math.floor(left / 60000);
  return minutes < 1 ? 'under a minute left' : `${minutes} min left`;
}

export function ago(at: string | number, now: number) {
  const seconds = Math.max(0, Math.round((now - (typeof at === 'number' ? at : Date.parse(at))) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} h ago`;
}
