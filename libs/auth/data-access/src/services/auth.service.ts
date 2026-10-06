import { HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  ConfirmationResponse,
  LoginUser,
  LoginUserRequest,
  NewUser,
  NewUserRequest,
  User,
  UserResponse,
} from '@realworld/core/api-types';
import { SKIP_LOGIN_REDIRECT } from '@realworld/core/error-handler';
import { ApiService } from '@realworld/core/http-client';
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
  // up for, e.g. ["google", "facebook"].
  providers(): Observable<{ providers: string[] }> {
    return this.apiService.get<{ providers: string[] }>('/auth/providers');
  }

  update(user: User): Observable<UserResponse> {
    return this.apiService.put('/user', { user });
  }

  // A 401 here means a wrong email or password: the page shows the message
  // instead of the usual redirect to the sign-in page.
  login(credentials: LoginUser): Observable<UserResponse> {
    return this.apiService.post<UserResponse, LoginUserRequest>(
      '/users/login',
      { user: credentials },
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

  // Signs in, or (when the backend confirms emails) sends a link to the
  // email instead.
  register(credentials: NewUser): Observable<UserResponse | ConfirmationResponse> {
    return this.apiService.post<UserResponse | ConfirmationResponse, NewUserRequest>('/users', {
      user: credentials,
    });
  }

  // Opens the link from a confirmation email: confirms it and signs in.
  confirmEmail(token: string): Observable<UserResponse> {
    return this.apiService.post<UserResponse, { token: string }>('/users/confirm-email', { token });
  }

  // Sends a sign-up's confirmation link again.
  resendConfirmation(email: string): Observable<ConfirmationResponse> {
    return this.apiService.post<ConfirmationResponse, { user: { email: string } }>('/users/confirm-email/resend', {
      user: { email },
    });
  }
}
