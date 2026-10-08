import { Schemas } from './schemas';

export type NewUserRequest = Schemas['NewUser'];
export type NewUser = NewUserRequest['user'];

export type LoginUserRequest = Schemas['LoginUser'];
export type LoginUser = LoginUserRequest['user'];

export type ResendConfirmationRequest = Schemas['ResendConfirmation'];

// The sign-in providers the backend is set up for, e.g. ["google"].
export type ProvidersResponse = Schemas['ProvidersResponse'];
