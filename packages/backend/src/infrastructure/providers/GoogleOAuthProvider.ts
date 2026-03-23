import {
  OAuthProvider,
  OAuthUserInfo,
} from "../../domain/interfaces/OAuthProvider";
import { OAuth2Client } from "google-auth-library";
import { config } from "../../config/config";

export class GoogleOAuthProvider implements OAuthProvider {
  private client: OAuth2Client;

  constructor() {
    this.client = new OAuth2Client(
      config.auth.google.clientId,
      config.auth.google.clientSecret,
      "postmessage",
    );
  }

  async getUserInfo(code: string): Promise<OAuthUserInfo> {
    const { tokens } = await this.client.getToken(code);
    const ticket = await this.client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: config.auth.google.clientId,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      throw new Error("Invalid Google Token");
    }

    return {
      email: payload.email,
      name: payload.name || undefined,
      providerId: payload.sub,
      provider: "google",
      avatarUrl: payload.picture || undefined,
    };
  }
}
