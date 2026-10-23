// A time in a pull, from its start: "0:05", "12:30", or "-0:10" in the
// countdown before it (an Earthly Star put down early).
export function pullClock(ms: number): string {
  if (ms <= -1000) return `-${pullClock(-ms)}`;
  const seconds = Math.max(Math.floor(ms / 1000), 0);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
