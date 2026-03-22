import type { UserRepository } from "../../domain/interfaces/UserRepository";
import type { BunJwtService } from "../../infrastructure/security/BunJwtService";

export class MeController {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: BunJwtService,
  ) {}

  public async getProfile(req: Request): Promise<Response> {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const payload = this.jwtService.verifyToken(token);
      if (!payload || !payload.id) {
        throw new Error("Invalid token payload");
      }

      const user = await this.userRepository.findById(payload.id);
      if (!user) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
        createdAt: user.createdAt.toISOString(),
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
}
