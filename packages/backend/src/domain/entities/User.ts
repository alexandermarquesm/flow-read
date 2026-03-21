import type { OAuthProvider } from "@flow-read/shared";

export class User {
  constructor(
    public readonly id: string,
    public email: string,
    public name: string,
    public provider: OAuthProvider,
    public providerId: string,
    public avatarUrl?: string,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  public updateProfile(name: string, avatarUrl?: string) {
    this.name = name;
    this.avatarUrl = avatarUrl;
    this.updatedAt = new Date();
  }
}
