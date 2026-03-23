import { UserRepository } from "../domain/interfaces/UserRepository";
import { InvalidCredentialsError } from "../domain/errors/AuthErrors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config/config";
import { AuthResponse } from "@flow-read/shared";

interface LoginRequest {
  email: string;
  password: string;
}

export class LoginUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(request: LoginRequest): Promise<AuthResponse> {
    const user = await this.userRepository.findByEmail(request.email);

    if (!user || user.provider !== "local" || !user.passwordHash) {
      throw new InvalidCredentialsError();
    }

    const isPasswordValid = await bcrypt.compare(
      request.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.auth.jwtSecret,
      { expiresIn: "7d" }
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
