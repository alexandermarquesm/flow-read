import type { User } from "../entities/User";
import type { OAuthProvider } from "@flow-read/shared";

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByProviderId(provider: OAuthProvider, providerId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
  update(user: User): Promise<void>;
}
