// A time in a pull, from its start: "0:05", "12:30", or "-0:10" in the
// countdown before it (an Earthly Star put down early).
export function pullClock(ms: number): string {
  if (ms <= -1000) return `-${pullClock(-ms)}`;
  const seconds = Math.max(Math.floor(ms / 1000), 0);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

// When a cast that landed early in the pull began: in the countdown, when
// its cast time is longer than the pull had run (the log only has where it
// landed, without a cast bar); null when it began in the pull.
export function countdownStart(at: number, loggedCastMs: number | null, castMs: number): number | null {
  return loggedCastMs === null && castMs > at ? at - castMs : null;
}

// A time in a pull to the tenth of a second: "0:05.3", "12:30.0", or
// "-0:01.3" in the countdown, for the pull's table.
export function pullClockTenths(ms: number): string {
  const tenths = Math.floor(Math.abs(ms) / 100);
  const seconds = Math.floor(tenths / 10);
  const text = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}.${tenths % 10}`;
  return ms < 0 && tenths > 0 ? `-${text}` : text;
}
