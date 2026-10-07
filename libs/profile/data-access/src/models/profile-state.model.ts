import { Profile } from '@everise/core/api-types';

export type ProfileState = Profile;

export const profileInitialState: ProfileState = {
  id: '',
  username: '',
  bio: null,
  image: '',
  following: false,
};
