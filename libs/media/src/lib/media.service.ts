import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '@realworld/core/http-client';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';

// An uploaded image or GIF, where it's served.
export interface UploadedMedia {
  id: string;
  url: string;
  contentType: string;
  width: number;
  height: number;
}

// A GIF from the GIPHY search.
export interface Gif {
  id: string;
  title: string;
  previewUrl: string;
  url: string;
  width: number;
  height: number;
}

export const MAX_UPLOAD_MB = 5;

// Uploads and the GIF search, from the backend's /api/media and /api/gifs.
@Injectable({ providedIn: 'root' })
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
