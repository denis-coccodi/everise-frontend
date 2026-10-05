import { User } from '@realworld/core/api-types';

export type AuthState = {
  loggedIn: boolean;
  user: User;
  // A profile picture upload or removal in progress, and why the last one
  // failed.
  imageBusy: boolean;
  imageError: string | null;
};

export const initialUserValue: User = {
  email: '',
  username: '',
  password: '',
  bio: '',
  image: '',
};

export const authInitialState: AuthState = {
  loggedIn: false,
  user: initialUserValue,
  imageBusy: false,
  imageError: null,
};
