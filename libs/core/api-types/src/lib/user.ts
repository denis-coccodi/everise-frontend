export interface User {
  email: string;
  password?: string;
  username: string;
  token?: string;
  bio: string;
  image: string;
  // The site's colour mode, saved with the other settings (true: dark).
  darkMode?: boolean;
}

export interface UserResponse {
  user: User;
}
