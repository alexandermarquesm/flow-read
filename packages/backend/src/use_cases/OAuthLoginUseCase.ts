import { UserRepository } from "../domain/interfaces/UserRepository";
import { OAuthProvider } from "../domain/interfaces/OAuthProvider";
import { User } from "../domain/entities/User";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config/config";
import { AuthResponse } from "@flow-read/shared";

export class OAuthLoginUseCase {
  constructor(
    private userRepository: UserRepository,
    private oAuthProvider: OAuthProvider,
  ) {}

  async execute(code: string): Promise<AuthResponse> {
    // 1. Get User Info from Provider
    const userInfo = await this.oAuthProvider.getUserInfo(code);

    // 2. Find or Create User in DB
    let user = await this.userRepository.findByEmail(userInfo.email);

    if (!user) {
      // Create new user if not exists
      user = new User(
        uuidv4(),
        userInfo.email,
        userInfo.name || "User",
        userInfo.provider,
        userInfo.providerId,
        undefined, // no password for OAuth
        userInfo.avatarUrl,
      );
      await this.userRepository.save(user);
    } else {
      // Refresh user data
      let hasChanges = false;
      if (userInfo.name && user.name !== userInfo.name) {
        user.name = userInfo.name;
        hasChanges = true;
      }
      if (userInfo.avatarUrl && user.avatarUrl !== userInfo.avatarUrl) {
        user.avatarUrl = userInfo.avatarUrl;
        hasChanges = true;
      }
      if (hasChanges) {
        await this.userRepository.save(user);
      }
    }

    // 3. Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.auth.jwtSecret,
      { expiresIn: "7d" },
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  }
}
