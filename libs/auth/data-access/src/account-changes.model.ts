// The account's email address or password, each changed in its own window
// in the settings. Both need the current password when the account has one
// (the backend checks it).
export type EmailChange = { email: string; currentPassword?: string };

export type PasswordChange = { password: string; currentPassword: string };

export type AccountChangesState = {
  // Which window is open.
  editing: 'email' | 'password' | null;
  saving: boolean;
  // Why the last try failed, shown in the window.
  error: string | null;
  // What the last change did, shown in the settings once the window closes.
  done: string | null;
};
