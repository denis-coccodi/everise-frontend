import { Schemas } from './schemas';
import { Role } from './user';

// The admin's tools (GET/PUT /api/admin/...).

// A member as the admin's list shows them.
export type Member = Schemas['Member'];

// The roles an admin can give; admin itself comes from the backend's settings.
export type AssignableRole = Exclude<Role, 'admin'>;

// Whether the staging site's access list (Cloudflare Access) was updated.
export type StagingAccessResult = Schemas['StagingAccessSync'];

export type MembersResponse = Schemas['MembersResponse'];
export type RoleChangeResponse = Schemas['RoleChangeResponse'];

// A member deleted for good, with how many of their own posts and comments
// went with them; stagingAccess is there when they were a staging tester.
export type MemberDeletedResponse = Schemas['MemberDeletionResponse'];

export type StagingAccessResponse = Schemas['StagingAccessResponse'];

// A Waking Sands character as admins edit it: the shipped personality
// (defaultPersona) with the admin's changes. Only Tataru has a bio.
export type CharacterSettings = Schemas['AdminCharacter'];

// The characters, and the longest title and personality the forms allow.
export type CharactersResponse = Schemas['AdminCharactersResponse'];

export type CharacterResponse = Schemas['AdminCharacterResponse'];

// What an admin changes; an empty title or persona goes back to the default.
export type CharacterChanges = Schemas['CharacterUpdate']['character'];
