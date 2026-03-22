import { User } from "../domain/entities/User";
import type { UserRepository } from "../domain/interfaces/UserRepository";
import type { OAuthProviderService } from "../domain/services/OAuthProviderService";
import type { JwtService } from "../domain/services/JwtService";
import type { OAuthProvider, AuthResponse } from "@flow-read/shared";

export class OAuthLoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly providerServices: Map<OAuthProvider, OAuthProviderService>,
    private readonly jwtService: JwtService,
  ) {}

  async execute(
    providerName: OAuthProvider,
    code: string,
  ): Promise<AuthResponse> {
    const providerService = this.providerServices.get(providerName);
    if (!providerService) {
      throw new Error(`Unsupported OAuth provider: ${providerName}`);
    }

    // 1. Exchange code for profile data
    console.log(`[OAuth UseCase] GET profile for ${providerName}...`);
    const profile = await providerService.getProfileFromCode(code);
    console.log(`[OAuth UseCase] Got profile: ${profile.email}`);

    // 2. Check if user already exists
    console.log(`[OAuth UseCase] Searching for user by providerId: ${profile.providerId}...`);
    let user = await this.userRepository.findByProviderId(
      providerName,
      profile.providerId,
    );
    console.log(`[OAuth UseCase] User search result: ${user ? "Existing" : "New"}`);

    if (user) {
      // 3a. Update existing user's profile info
      user.updateProfile(profile.name, profile.avatarUrl);
      await this.userRepository.update(user);
    } else {
      // 3b. Check if email is already taken by a different provider
      const existingEmailUser = await this.userRepository.findByEmail(profile.email).catch(() => null);
      if (existingEmailUser) {
        throw new Error(`Email already registered with provider: ${existingEmailUser.provider}`);
      }

      // 3c. Create new user
      const id = crypto.randomUUID(); // Build-in Node/Bun crypto
      user = new User(
        id,
        profile.email,
        profile.name,
        providerName,
        profile.providerId,
        profile.avatarUrl,
      );
      await this.userRepository.save(user);
    }

    // 4. Generate JWT
    const token = this.jwtService.generateToken(user);

    // 5. Return shared auth response format
    return {
      user: {
        id: user!.id,
        email: user!.email,
        name: user!.name,
        avatarUrl: user!.avatarUrl,
        provider: user!.provider,
        providerId: user!.providerId,
        createdAt: user!.createdAt.toISOString(),
        updatedAt: user!.updatedAt.toISOString(),
      },
      token,
    };
  }
}
