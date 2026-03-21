import type { UserRepository } from "../../domain/repositories/UserRepository";
import { User } from "../../domain/entities/User";
import type { PrismaClient } from "@prisma/client";
import type { OAuthProvider } from "@flow-read/shared";

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const userModel = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!userModel) return null;

    return new User(
      userModel.id,
      userModel.email,
      userModel.name,
      userModel.provider as any, // We trust our DB to have the correct enum string
      userModel.providerId,
      userModel.avatarUrl || undefined,
      userModel.createdAt,
      userModel.updatedAt,
    );
  }

  async findByProviderId(
    provider: OAuthProvider,
    providerId: string,
  ): Promise<User | null> {
    const userModel = await this.prisma.user.findUnique({
      where: { providerId },
    });

    if (!userModel) return null;

    return new User(
      userModel.id,
      userModel.email,
      userModel.name,
      userModel.provider as any,
      userModel.providerId,
      userModel.avatarUrl || undefined,
      userModel.createdAt,
      userModel.updatedAt,
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    const userModel = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!userModel) return null;

    return new User(
      userModel.id,
      userModel.email,
      userModel.name,
      userModel.provider as any,
      userModel.providerId,
      userModel.avatarUrl || undefined,
      userModel.createdAt,
      userModel.updatedAt,
    );
  }

  async save(user: User): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        name: user.name,
        provider: user.provider,
        providerId: user.providerId,
        avatarUrl: user.avatarUrl,
        updatedAt: user.updatedAt,
      },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        providerId: user.providerId,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  }

  async update(user: User): Promise<void> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.email,
        name: user.name,
        provider: user.provider,
        providerId: user.providerId,
        avatarUrl: user.avatarUrl,
        updatedAt: user.updatedAt,
      },
    });
  }
}
