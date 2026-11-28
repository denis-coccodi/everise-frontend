import { pullTimeline } from './planner-fixtures';
import { mechanicLabel } from './played-deaths-label';

describe('mechanicLabel', () => {
  // Killer Voice, once at 1:05 unless a test adds more.
  const fixture = pullTimeline();
  const voice = (at: number) => ({ ...fixture.damage[0], at });
  const base = { ...fixture, damage: [voice(65_000)] };

  it('gives only the time for an attack that comes once', () => {
    expect(mechanicLabel(base, 'Killer Voice', 65_000)).toBe('Killer Voice (at 1:05)');
  });

  it('says which time it was, counting waves close together as one', () => {
    const timeline = { ...base, damage: [voice(65_000), voice(71_000), voice(90_000), voice(130_000)] };
    expect(mechanicLabel(timeline, 'Killer Voice', 71_000)).toBe('Killer Voice (the 1st time this pull, at 1:11)');
    expect(mechanicLabel(timeline, 'Killer Voice', 90_000)).toBe('Killer Voice (the 2nd time this pull, at 1:30)');
    expect(mechanicLabel(timeline, 'Killer Voice', 130_000)).toBe('Killer Voice (the 3rd time this pull, at 2:10)');
  });

  it('names the phase in fights split into phases', () => {
    const timeline = { ...base, phases: [{ at: 60_000, name: 'P2: Usurper', intermission: false }] };
    expect(mechanicLabel(timeline, 'Killer Voice', 65_000)).toBe('Killer Voice (in P2: Usurper, at 1:05)');
  });
});
