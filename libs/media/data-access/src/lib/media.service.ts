import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { API_URL } from '@everise/core/http-client';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import type { UploadedMedia, Gif } from './media.model';

// Uploads and the GIF search, from the backend's /api/media and /api/gifs.
@Service()
export class MediaService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);

  // Asked once per visit.
  readonly gifsAvailable$ = this.http.get<{ available: boolean }>(`${this.api}/gifs/available`).pipe(
    map(({ available }) => available),
    catchError(() => of(false)),
    shareReplay(1),
  );

  upload(file: Blob): Observable<UploadedMedia> {
    return this.http
      .post<{ media: UploadedMedia }>(`${this.api}/media`, file, {
        headers: { 'Content-Type': file.type || 'application/octet-stream', Accept: 'application/json' },
        withCredentials: true,
      })
      .pipe(map(({ media }) => media));
  }

  searchGifs(query: string, offset = 0): Observable<{ gifs: Gif[]; next: number | null }> {
    return this.http.get<{ gifs: Gif[]; next: number | null }>(`${this.api}/gifs`, {
      params: new HttpParams({ fromObject: { q: query, offset } }),
      withCredentials: true,
    });
  }
}
