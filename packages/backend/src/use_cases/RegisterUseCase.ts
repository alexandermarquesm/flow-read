import { UserRepository } from "../domain/interfaces/UserRepository";
import { User } from "../domain/entities/User";
import { UserAlreadyExistsError } from "../domain/errors/AuthErrors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config/config";
import { AuthResponse } from "@flow-read/shared";

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export class RegisterUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(request: RegisterRequest): Promise<AuthResponse> {
    const existingUser = await this.userRepository.findByEmail(request.email);

    if (existingUser) {
      throw new UserAlreadyExistsError();
    }

    const passwordHash = await bcrypt.hash(request.password, 10);
    const newUser = new User(
      uuidv4(),
      request.email,
      request.name,
      "local",
      undefined,
      passwordHash
    );

    await this.userRepository.save(newUser);

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      config.auth.jwtSecret,
      { expiresIn: "7d" }
    );

    return {
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        provider: "local",
        createdAt: newUser.createdAt.toISOString(),
        updatedAt: newUser.updatedAt.toISOString(),
      },
    };
  }
}
