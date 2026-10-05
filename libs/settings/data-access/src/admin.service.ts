import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  AssignableRole,
  MemberDeletedResponse,
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

  // A page of members whose username or email contains `search`.
  members(search: string, limit: number, offset: number) {
    const params = new HttpParams({ fromObject: { search, limit, offset } });
    return this.api.get<MembersResponse>('/admin/users', params);
  }

  setRole(username: string, role: AssignableRole) {
    return this.api.put<RoleChangeResponse, { role: AssignableRole }>(
      `/admin/users/${encodeURIComponent(username)}/role`,
      { role },
    );
  }

  // Deletes a member and everything they posted, for good.
  deleteMember(username: string) {
    return this.api.delete<MemberDeletedResponse>(`/admin/users/${encodeURIComponent(username)}`);
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
