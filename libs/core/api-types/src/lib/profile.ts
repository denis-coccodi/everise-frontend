export interface Profile {
  // What identifies the member in links and API paths. Never their username.
  id: string;
  username: string;
  bio: string;
  image: string;
  following: boolean;
  loading: boolean;
}

export interface ProfileResponse {
  profile: Profile;
}
