import { Schemas } from './schemas';

// The signed-in user (GET /api/user), with their token and settings.
export type User = Schemas['User'];

// What a person may do: everyone registers as a user; an admin can make a
// user a staging tester, who may open the staging site.
export type Role = User['role'];

// How the account can be signed in to: its password, and the provider
// accounts (Google, Facebook, Microsoft, Discord) tied to it.
export type SignInMethod = User['signInMethods'][number];

export type UserResponse = Schemas['UserResponse'];

// The settings: only the fields being changed.
export type UserUpdate = Schemas['UserUpdate'];

// A sign-up whose email has to be confirmed first: a link went to `email`.
export type ConfirmationResponse = Schemas['ConfirmationResponse'];

// What the settings change (PUT /api/user's `user`).
export type UserChanges = UserUpdate['user'];
