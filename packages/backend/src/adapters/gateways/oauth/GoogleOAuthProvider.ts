import type {
  OAuthProviderService,
  OAuthProfile,
} from "../../../domain/services/OAuthProviderService";
import type { OAuthProvider } from "@flow-read/shared";

export class GoogleOAuthProvider implements OAuthProviderService {
  public readonly providerName: OAuthProvider = "google";

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
  ) {}

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state: state, // CSRF protection
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async getProfileFromCode(code: string): Promise<OAuthProfile> {
    // 1. Exchange code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Google token error: ${await tokenResponse.text()}`);
    }

    const { access_token } = (await tokenResponse.json()) as any;

    // 2. Fetch user profile
    const profileResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );

    if (!profileResponse.ok) {
      throw new Error(`Google profile error: ${await profileResponse.text()}`);
    }

    const profileData = (await profileResponse.json()) as any;

    return {
      providerId: profileData.id,
      email: profileData.email,
      name: profileData.name || profileData.given_name,
      avatarUrl: profileData.picture,
    };
  }
}
