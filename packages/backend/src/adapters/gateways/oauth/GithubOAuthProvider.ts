import type {
  OAuthProviderService,
  OAuthProfile,
} from "../../../domain/services/OAuthProviderService";
import type { OAuthProvider } from "@flow-read/shared";

export class GithubOAuthProvider implements OAuthProviderService {
  public readonly providerName: OAuthProvider = "github";

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
  ) {}

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: "read:user user:email",
      state: state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async getProfileFromCode(code: string): Promise<OAuthProfile> {
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.redirectUri,
        }),
      },
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`[GitHub Auth Error] Token exchange failed: ${errorText}`);
      throw new Error(`GitHub token error: ${errorText}`);
    }

    const data = await tokenResponse.json() as any;
    console.log(`[GitHub Auth] Token response: ${JSON.stringify(data)}`);
    const { access_token } = data;

    if (!access_token) {
      throw new Error("Failed to obtain access token from GitHub");
    }

    const profileResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!profileResponse.ok) {
      throw new Error(`GitHub profile error: ${await profileResponse.text()}`);
    }

    const profileData = (await profileResponse.json()) as any;

    let email = profileData.email;
    if (!email) {
      const emailResponse = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (emailResponse.ok) {
        const emails = (await emailResponse.json()) as any;
        const primaryEmail = emails.find((e: any) => e.primary && e.verified);
        if (primaryEmail) {
          email = primaryEmail.email;
        }
      }
    }

    return {
      providerId: profileData.id.toString(),
      email: email || `${profileData.login}@github.com`, // fallback
      name: profileData.name || profileData.login,
      avatarUrl: profileData.avatar_url,
    };
  }
}
