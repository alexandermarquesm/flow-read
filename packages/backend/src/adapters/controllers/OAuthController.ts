import type { OAuthLoginUseCase } from "../../use_cases/OAuthLoginUseCase";
import type { OAuthProviderService } from "../../domain/services/OAuthProviderService";
import type { OAuthProvider } from "@flow-read/shared";

export class OAuthController {
  constructor(
    private readonly loginUseCase: OAuthLoginUseCase,
    private readonly providerServices: Map<OAuthProvider, OAuthProviderService>,
    private readonly frontendUrl: string,
  ) {}

  public getAuthUrl(providerName: OAuthProvider, state: string): string | null {
    const service = this.providerServices.get(providerName);
    if (!service) return null;
    return service.getAuthUrl(state);
  }

  public async handleCallback(
    providerName: OAuthProvider,
    code: string,
  ): Promise<{ redirectUrl: string, token?: string, user?: any } | null> {
    try {
      console.log(`[OAuth Controller] Calling loginUseCase for ${providerName}...`);
      const authResult = await this.loginUseCase.execute(providerName, code);
      console.log(`[OAuth Controller] loginUseCase success for ${authResult.user.email}`);

      // We return the token separately so the server can set an HttpOnly cookie
      const redirectUrl = new URL(`${this.frontendUrl}/auth/callback`);
      redirectUrl.searchParams.set("user", JSON.stringify(authResult.user));
      if (authResult.token) {
        redirectUrl.searchParams.set("token", authResult.token);
      }
      return { redirectUrl: redirectUrl.toString(), token: authResult.token };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "OAuthLoginFailed";
      console.warn(`[OAuth Warning] Handled failed login attempt for ${providerName}: ${errorMessage}`);
      
      const errorUrl = new URL(this.frontendUrl);
      errorUrl.searchParams.set("error", errorMessage);
      return { redirectUrl: errorUrl.toString() };
    }
  }
}
