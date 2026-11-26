import { failingNote } from './failing-note';

describe('failingNote', () => {
  it("says where the party fails so heavily that the plan uses a healer's Limit Break", () => {
    expect(failingNote([65_000, 610_500])).toBe(
      "The party is failing heavily at 1:05, 10:10: so many die at once that the plan brings everyone back with Pulse of Life, a healer's Limit Break.",
    );
  });

  it('says nothing where it never does', () => {
    expect(failingNote(undefined)).toBe('');
    expect(failingNote([])).toBe('');
  });
});
