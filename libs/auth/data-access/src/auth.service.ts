import { HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  ConfirmationResponse,
  LoginUserRequest,
  NewPasswordWithCode,
  NewUserRequest,
  PasswordResetRequest,
  PasswordResetResponse,
  ProvidersResponse,
  ResendConfirmationRequest,
  UserChanges,
  UserResponse,
  UserUpdate,
} from '@everise/core/api-types';
import { SKIP_LOGIN_REDIRECT } from '@everise/core/error-handler';
import { ApiService } from '@everise/core/http-client';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiService = inject(ApiService);

  // The session check: a 401 means nobody is logged in, which is fine on
  // public pages such as the roulette.
  user(): Observable<UserResponse> {
    return this.apiService.get<UserResponse>(
      '/user',
      new HttpParams(),
      new HttpContext().set(SKIP_LOGIN_REDIRECT, true),
    );
  }

  // The ways to sign in besides email and password that the backend is set
  // up for, e.g. ["google", "discord"].
  providers(): Observable<ProvidersResponse> {
    return this.apiService.get<ProvidersResponse>('/auth/providers');
  }

  update(user: UserChanges): Observable<UserResponse> {
    return this.apiService.put<UserResponse, UserUpdate>('/user', { user });
  }

  // A 401 here means a wrong email or password: the page shows the message
  // instead of the usual redirect to the sign-in page. The request carries
  // the bot check's token (Turnstile) when the site has one.
  login(request: LoginUserRequest): Observable<UserResponse> {
    return this.apiService.post<UserResponse, LoginUserRequest>(
      '/users/login',
      request,
      new HttpContext().set(SKIP_LOGIN_REDIRECT, true),
    );
  }

  // Uploads a new profile picture; the response is the updated user.
  uploadImage(file: Blob): Observable<UserResponse> {
    return this.apiService.putFile<UserResponse>('/user/image', file);
  }

  // Goes back to the default profile picture.
  removeImage(): Observable<UserResponse> {
    return this.apiService.delete<UserResponse>('/user/image');
  }

  logout(): Observable<{ message: string }> {
    return this.apiService.post<{ message: string }, void>('/users/logout');
  }

  // Ends every session, on every device (and clears this one's cookie).
  logoutEverywhere(): Observable<void> {
    return this.apiService.post<void, void>('/users/logout-everywhere');
  }

  // "Forgot password?": emails a code, if the address has an account. The
  // answer is the same either way.
  requestPasswordReset(request: PasswordResetRequest): Observable<PasswordResetResponse> {
    return this.apiService.post<PasswordResetResponse, PasswordResetRequest>('/users/password-reset', request);
  }

  // Sets a new password with the code from the email. Doesn't sign in.
  resetPassword(request: NewPasswordWithCode): Observable<void> {
    return this.apiService.post<void, NewPasswordWithCode>('/users/password-reset/confirm', request);
  }

  // Signs in, or (when the backend confirms emails) sends a link to the
  // email instead.
  register(request: NewUserRequest): Observable<UserResponse | ConfirmationResponse> {
    return this.apiService.post<UserResponse | ConfirmationResponse, NewUserRequest>('/users', request);
  }

  // Opens the link from a confirmation email: confirms it and signs in.
  confirmEmail(token: string): Observable<UserResponse> {
    return this.apiService.post<UserResponse, { token: string }>('/users/confirm-email', { token });
  }

  // Sends a sign-up's confirmation link again.
  resendConfirmation(email: string, turnstileToken?: string): Observable<ConfirmationResponse> {
    return this.apiService.post<ConfirmationResponse, ResendConfirmationRequest>('/users/confirm-email/resend', {
      user: { email },
      turnstileToken,
    });
  }
}
