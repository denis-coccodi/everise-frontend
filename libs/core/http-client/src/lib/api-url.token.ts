import { InjectionToken } from '@angular/core';

export const API_URL = new InjectionToken<string>('API_URL');

// Where the backend serves a game image (an icon or banner id from its FFXIV
// data); undefined without one.
export function gameImageUrl(apiUrl: string, id: number | null | undefined): string | undefined {
  return id ? `${apiUrl}/images/${id}` : undefined;
}
