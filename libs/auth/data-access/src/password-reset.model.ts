export type PasswordResetState = {
  // Asking for a code, or setting the password, right now.
  busy: boolean;
  // The new password is set; every device was signed out.
  done: boolean;
};
