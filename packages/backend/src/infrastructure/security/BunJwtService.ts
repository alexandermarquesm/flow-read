import jwt from "jsonwebtoken";
import type { JwtService } from "../../domain/services/JwtService";
import type { User } from "../../domain/entities/User";

export class BunJwtService implements JwtService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  generateToken(user: User): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        provider: user.provider,
        providerId: user.providerId,
      },
      this.secret,
      { expiresIn: this.expiresIn as jwt.SignOptions["expiresIn"] },
    );
  }

  verifyToken(token: string): any {
    return jwt.verify(token, this.secret, { algorithms: ["HS256"] });
  }
}
