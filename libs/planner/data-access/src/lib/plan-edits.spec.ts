import type { Plan } from '@everise/planner/scheduler';
import { editWarning, withAdded } from './plan-edits';

describe("an edit's warning", () => {
  const plan = (short: number[]) =>
    ({
      mechanics: [
        { id: 1, at: 194_000, name: 'Killer Voice' },
        { id: 2, at: 340_000, name: 'Blast Beat' },
      ],
      hits: [1, 2].map((mechanic) => ({ mechanic, player: 1, safe: !short.includes(mechanic) })),
    }) as unknown as Plan;

  it('says which hits the edit left short that were safe before', () => {
    expect(editWarning(plan([]), plan([1, 2]))).toBe(
      'Your edits leave 2 more hits short than the plan without them (3:14 Killer Voice, 5:40 Blast Beat).',
    );
    expect(editWarning(plan([1]), plan([1, 2]))).toBe(
      'Your edits leave 1 more hit short than the plan without them (5:40 Blast Beat).',
    );
  });

  it('says nothing when it leaves none short that were safe', () => {
    expect(editWarning(plan([1]), plan([1]))).toBe('');
    expect(editWarning(plan([1, 2]), plan([]))).toBe('');
  });
});

describe('withAdded', () => {
  const hallowed = (at: number) => ({ player: 11, action: 30, at });

  it('adds a skill, and one put back where it was removed undoes the removal', () => {
    const removed = { added: [], removed: [hallowed(102_900)] };

    // Put back 0.1s from where it was: neither edit stays.
    expect(withAdded(removed, [hallowed(102_800)])).toEqual({ added: [], removed: [] });
    // Elsewhere: a move, both stay.
    expect(withAdded(removed, [hallowed(29_000)])).toEqual({ added: [hallowed(29_000)], removed: [hallowed(102_900)] });
  });
});
