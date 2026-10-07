import { User } from '@everise/core/api-types';

export type AuthState = {
  loggedIn: boolean;
  user: User;
  // A profile picture upload or removal in progress, and why the last one
  // failed.
  imageBusy: boolean;
  imageError: string | null;
  // The address a confirmation link went to (after signing up, or signing
  // in before opening it), while the page offers to send it again.
  awaitingConfirmation: string | null;
};

// Signed out: no one, with the settings' defaults.
export const initialUserValue: User = {
  id: '',
  email: '',
  username: '',
  token: '',
  bio: null,
  image: '',
  darkMode: true,
  role: 'user',
  signInMethods: [],
  pendingEmail: null,
};

export const authInitialState: AuthState = {
  loggedIn: false,
  user: initialUserValue,
  imageBusy: false,
  imageError: null,
  awaitingConfirmation: null,
};
