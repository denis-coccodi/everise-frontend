import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  AssignableRole,
  CharacterChanges,
  CharacterResponse,
  CharactersResponse,
  MemberDeletedResponse,
  MembersResponse,
  RoleChangeResponse,
  StagingAccessResponse,
} from '@everise/core/api-types';
import { ApiService } from '@everise/core/http-client';

// The admin's tools on the backend (/api/admin; only for admins).
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

  // A page of members whose username or email contains `search`.
  members(search: string, limit: number, offset: number) {
    const params = new HttpParams({ fromObject: { search, limit, offset } });
    return this.api.get<MembersResponse>('/admin/users', params);
  }

  setRole(id: string, role: AssignableRole) {
    return this.api.put<RoleChangeResponse, { role: AssignableRole }>(`/admin/users/${encodeURIComponent(id)}/role`, {
      role,
    });
  }

  // Deletes a member and everything they posted, for good.
  deleteMember(id: string) {
    return this.api.delete<MemberDeletedResponse>(`/admin/users/${encodeURIComponent(id)}`);
  }

  // Writes the staging testers to the staging site's access list again.
  syncStagingAccess() {
    return this.api.post<StagingAccessResponse, void>('/admin/staging-access');
  }

  // The Waking Sands characters, with their personalities and pictures.
  characters() {
    return this.api.get<CharactersResponse>('/admin/characters');
  }

  updateCharacter(id: string, character: CharacterChanges) {
    return this.api.put<CharacterResponse, { character: CharacterChanges }>(
      `/admin/characters/${encodeURIComponent(id)}`,
      { character },
    );
  }

  uploadCharacterPicture(id: string, picture: Blob) {
    return this.api.putFile<CharacterResponse>(`/admin/characters/${encodeURIComponent(id)}/image`, picture);
  }
}
