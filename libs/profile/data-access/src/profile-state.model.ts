import { Profile } from '@everise/core/api-types';

// `character`: the Waking Sands character's id on a character's profile,
// null on a member's.
export type ProfileState = Omit<Profile, 'character'> & { character: string | null };

export const profileInitialState: ProfileState = {
  id: '',
  username: '',
  bio: null,
  image: '',
  following: false,
  character: null,
};
