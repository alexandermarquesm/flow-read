export type OAuthProvider = "google" | "github";

export interface OAuthUser {
  id: string; // Our internal DB ID
  email: string;
  name: string;
  avatarUrl?: string;
  provider: OAuthProvider;
  providerId: string; // The ID from Google/GitHub
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: OAuthUser;
  token: string;
}
