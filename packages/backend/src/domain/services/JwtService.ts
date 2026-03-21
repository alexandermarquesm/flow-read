import type { User } from "../entities/User";

export interface JwtService {
  generateToken(user: User): string;
  verifyToken(token: string): any; // Ideally typed to a payload interface
}
