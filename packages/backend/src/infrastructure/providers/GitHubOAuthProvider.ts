import {
  OAuthProvider,
  OAuthUserInfo,
} from "../../domain/interfaces/OAuthProvider";
import axios from "axios";
import { config } from "../../config/config";

export class GitHubOAuthProvider implements OAuthProvider {
  async getUserInfo(code: string): Promise<OAuthUserInfo> {
    const clientId = config.auth.github.clientId;
    const clientSecret = config.auth.github.clientSecret;

    // 1. Exchange Code for Access Token
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (tokenResponse.data.error) {
      throw new Error(
        `GitHub Token Error: ${tokenResponse.data.error_description}`,
      );
    }

    const accessToken = tokenResponse.data.access_token;

    // 2. Get User Profile
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const user = userResponse.data;

    // 3. Get Email (if private)
    let email = user.email;
    if (!email) {
      const emailResponse = await axios.get(
        "https://api.github.com/user/emails",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      const primary = emailResponse.data.find(
        (e: any) => e.primary && e.verified,
      );
      email = primary ? primary.email : null;
    }

    if (!email) {
      throw new Error("No verified email found for GitHub user");
    }

    return {
      email: email,
      name: user.name || user.login,
      providerId: user.id.toString(),
      provider: "github",
      avatarUrl: user.avatar_url || undefined,
    };
  }
}
