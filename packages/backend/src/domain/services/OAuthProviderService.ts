import type { OAuthProvider } from "@flow-read/shared";

export interface OAuthProfile {
  providerId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface OAuthProviderService {
  providerName: OAuthProvider;
  getAuthUrl(state: string): string;
  getProfileFromCode(code: string): Promise<OAuthProfile>;
}
