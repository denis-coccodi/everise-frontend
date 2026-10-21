// A time in a pull, from its start: "0:05", "12:30".
export function pullClock(ms: number): string {
  const seconds = Math.max(Math.floor(ms / 1000), 0);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
