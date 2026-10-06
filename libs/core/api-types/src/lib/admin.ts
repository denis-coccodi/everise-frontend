import { Role } from './user';

// The admin's tools (GET/PUT /api/admin/...).

// A member as the admin's list shows them.
export interface Member {
  id: string;
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

// A page of members.
export interface MembersResponse {
  users: Member[];
  // How many members match the search, in all.
  usersCount: number;
  // Whether role changes reach the staging site's access list.
  stagingAccessConnected: boolean;
}

export interface RoleChangeResponse {
  user: Member;
  stagingAccess: StagingAccessResult;
}

// A member deleted for good, with how many of their own posts and comments
// went with them; stagingAccess is there when they were a staging tester.
export interface MemberDeletedResponse {
  deleted: { username: string; articles: number; comments: number };
  stagingAccess?: StagingAccessResult;
}

export interface StagingAccessResponse {
  stagingAccess: StagingAccessResult;
}

// A Waking Sands character as admins edit it: the shipped personality
// (defaultPersona) with the admin's changes. Only Tataru has a bio: she is
// also the account that posts guests' roulette results.
export interface CharacterSettings {
  id: string;
  name: string;
  title: string;
  persona: string;
  defaultPersona: string;
  image?: string;
  bio?: string | null;
  edited: { title: boolean; persona: boolean };
}

export interface CharactersResponse {
  characters: CharacterSettings[];
}

export interface CharacterResponse {
  character: CharacterSettings;
}

// What an admin changes; an empty title or persona goes back to the default.
export interface CharacterChanges {
  title?: string;
  persona?: string;
  bio?: string;
}
