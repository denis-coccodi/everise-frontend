import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api-url.token';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly api_url = inject(API_URL);

  get<T>(url: string, params: HttpParams = new HttpParams(), context?: HttpContext): Observable<T> {
    return this.http.get<T>(`${this.api_url}${url}`, {
      headers: this.headers,
      params,
      context,
      withCredentials: true,
    });
  }

  post<T, D>(url: string, data?: D, context?: HttpContext): Observable<T> {
    return this.http.post<T>(`${this.api_url}${url}`, JSON.stringify(data), {
      headers: this.headers,
      context,
      withCredentials: true,
    });
  }

  put<T, D>(url: string, data: D): Observable<T> {
    return this.http.put<T>(`${this.api_url}${url}`, JSON.stringify(data), {
      headers: this.headers,
      withCredentials: true,
    });
  }

  // Sends a file as the request body, with its own content type.
  putFile<T>(url: string, file: Blob): Observable<T> {
    return this.http.put<T>(`${this.api_url}${url}`, file, {
      headers: new HttpHeaders({
        'Content-Type': file.type || 'application/octet-stream',
        Accept: 'application/json',
      }),
      withCredentials: true,
    });
  }

  delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(`${this.api_url}${url}`, {
      headers: this.headers,
      withCredentials: true,
    });
  }

  get headers(): HttpHeaders {
    const headersConfig = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    return new HttpHeaders(headersConfig);
  }
}
