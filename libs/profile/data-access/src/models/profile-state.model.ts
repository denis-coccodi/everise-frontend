import { Profile } from '@realworld/core/api-types';

export type ProfileState = Profile;

export const profileInitialState: ProfileState = {
  id: '',
  username: '',
  bio: '',
  image: '',
  following: false,
  loading: false,
};
