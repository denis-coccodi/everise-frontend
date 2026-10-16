import { Schemas } from './schemas';

export type NewUserRequest = Schemas['NewUser'];
export type NewUser = NewUserRequest['user'];

export type LoginUserRequest = Schemas['LoginUser'];
export type LoginUser = LoginUserRequest['user'];

export type ResendConfirmationRequest = Schemas['ResendConfirmation'];

// The sign-in providers the backend is set up for, e.g. ["google"].
export type ProvidersResponse = Schemas['ProvidersResponse'];

// "Forgot password?": where to send the code, and the answer (sent if the
// address has an account).
export type PasswordResetRequest = Schemas['PasswordResetRequest'];
export type PasswordResetResponse = Schemas['PasswordResetResponse'];
// The code from the email, which finds the account, and the new password.
export type NewPasswordWithCode = Schemas['NewPasswordWithCode'];
