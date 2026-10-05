import { Role } from './user';

// The admin's tools (GET/PUT /api/admin/...).

// A member as the admin's list shows them.
export interface Member {
  username: string;
  email: string;
  image: string;
  role: Role;
}

// The roles an admin can give; admin itself comes from the backend's settings.
export type AssignableRole = Exclude<Role, 'admin'>;

// Whether the staging site's access list (Cloudflare Access) was updated.
export interface StagingAccessResult {
  synced: boolean;
  message: string;
}

export interface MembersResponse {
  users: Member[];
}

export interface RoleChangeResponse {
  user: Member;
  stagingAccess: StagingAccessResult;
}

export interface StagingAccessResponse {
  stagingAccess: StagingAccessResult;
}

// Tataru, the account that posts guests' roulette results.
export interface TataruProfile {
  username: string;
  bio: string | null;
  image: string;
}

export interface TataruResponse {
  tataru: TataruProfile;
}
