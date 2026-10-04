import { HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { LoginUser, LoginUserRequest, NewUser, NewUserRequest, User, UserResponse } from '@realworld/core/api-types';
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

  update(user: User): Observable<UserResponse> {
    return this.apiService.put('/user', { user });
  }

  login(credentials: LoginUser): Observable<UserResponse> {
    return this.apiService.post<UserResponse, LoginUserRequest>('/users/login', { user: credentials });
  }

  logout(): Observable<{ message: string }> {
    return this.apiService.post<{ message: string }, void>('/users/logout');
  }

  register(credentials: NewUser): Observable<UserResponse> {
    return this.apiService.post<UserResponse, NewUserRequest>('/users', { user: credentials });
  }
}
