import { OAuthProvider as SharedOAuthProvider } from "@flow-read/shared";

export interface OAuthUserInfo {
  email: string;
  name?: string;
  providerId: string;
  provider: SharedOAuthProvider;
  avatarUrl?: string;
}

export interface OAuthProvider {
  getUserInfo(tokenOrCode: string): Promise<OAuthUserInfo>;
}
