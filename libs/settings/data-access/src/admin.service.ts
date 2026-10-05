import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  AssignableRole,
  MembersResponse,
  RoleChangeResponse,
  StagingAccessResponse,
  TataruResponse,
} from '@realworld/core/api-types';
import { FAILURE_MESSAGE, UNREACHABLE_MESSAGE } from '@realworld/core/forms';
import { ApiService } from '@realworld/core/http-client';

// The admin's tools on the backend (/api/admin; only for admins).
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

  members() {
    return this.api.get<MembersResponse>('/admin/users');
  }

  setRole(username: string, role: AssignableRole) {
    return this.api.put<RoleChangeResponse, { role: AssignableRole }>(
      `/admin/users/${encodeURIComponent(username)}/role`,
      { role },
    );
  }

  // Writes the staging testers to the staging site's access list again.
  syncStagingAccess() {
    return this.api.post<StagingAccessResponse, void>('/admin/staging-access');
  }

  tataru() {
    return this.api.get<TataruResponse>('/admin/tataru');
  }

  updateTataru(bio: string) {
    return this.api.put<TataruResponse, { tataru: { bio: string } }>('/admin/tataru', { tataru: { bio } });
  }

  uploadTataruPicture(picture: Blob) {
    return this.api.putFile<TataruResponse>('/admin/tataru/image', picture);
  }
}

// The server's message for a failed request, or a plain one.
export function adminErrorMessage(response: HttpErrorResponse): string {
  const message = response.error?.errors?.body?.[0];
  if (typeof message === 'string') return message;
  return response.status === 0 ? UNREACHABLE_MESSAGE : FAILURE_MESSAGE;
}
