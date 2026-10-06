// What a person may do: everyone registers as a user; an admin can make a
// user a staging tester, who may open the staging site.
export type Role = 'admin' | 'staging-tester' | 'user';

export interface User {
  // The member's id, as in links to their profile.
  id: string;
  email: string;
  password?: string;
  username: string;
  token?: string;
  bio: string;
  image: string;
  // The site's colour mode, saved with the other settings (true: dark).
  darkMode?: boolean;
  role?: Role;
  // How the account can be signed in to: its password, and the provider
  // accounts (Google, Facebook, Microsoft, Discord) tied to it.
  signInMethods?: SignInMethod[];
  // A new address from the settings, used once the link sent to it is
  // opened.
  pendingEmail?: string | null;
}

export type SignInMethod = 'password' | 'google' | 'facebook' | 'microsoft' | 'discord';

export interface UserResponse {
  user: User;
}

// A sign-up whose email has to be confirmed first: a link went to `email`.
export interface ConfirmationResponse {
  confirmation: { email: string };
}
