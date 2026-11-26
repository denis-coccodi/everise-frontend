import { pullClock } from '@everise/planner/data-access';

// What the plan says where so many die at once that it brings the party back with a healer's Limit Break (`failing`:
// when it's cast); nothing where it doesn't.
export function failingNote(failing: number[] | undefined): string {
  if (!failing?.length) return '';
  const times = failing.map((at) => pullClock(at)).join(', ');
  return `The party is failing heavily at ${times}: so many die at once that the plan brings everyone back with Pulse of Life, a healer's Limit Break.`;
}
