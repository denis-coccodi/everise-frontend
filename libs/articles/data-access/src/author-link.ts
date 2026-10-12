import { Profile } from '@everise/core/api-types';

// Where a post's author leads: a member's profile, or the Waking Sands for a
// character (Tataru, who posts guests' roulette results), who has none.
export function authorLink(author: Profile): string[] {
  return author.character ? ['/waking-sands'] : ['/profile', author.id];
}
