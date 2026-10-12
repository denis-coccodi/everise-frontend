import { Profile } from '@everise/core/api-types';
import { authorLink } from './author-link';

const member: Profile = { id: 'm-1', username: 'Minfilia', following: false, bio: null, image: '/a.png' };

describe('authorLink', () => {
  it("leads to a member's profile", () => {
    expect(authorLink(member)).toEqual(['/profile', 'm-1']);
  });

  it('leads to the Waking Sands for a character, who has no profile', () => {
    expect(authorLink({ ...member, id: 'character:tataru', username: 'Tataru Taru', character: 'tataru' })).toEqual([
      '/waking-sands',
    ]);
  });
});
