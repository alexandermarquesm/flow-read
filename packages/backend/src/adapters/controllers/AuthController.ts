import { RegisterUseCase } from "../../use_cases/RegisterUseCase";
import { LoginUseCase } from "../../use_cases/LoginUseCase";
import { OAuthLoginUseCase } from "../../use_cases/OAuthLoginUseCase";
import { LibsqlUserRepository } from "../../infrastructure/repositories/LibsqlUserRepository";
import { GoogleOAuthProvider } from "../../infrastructure/providers/GoogleOAuthProvider";
import { GitHubOAuthProvider } from "../../infrastructure/providers/GitHubOAuthProvider";
import { DomainError } from "../../domain/errors/AuthErrors";

export class AuthController {
  private userRepository: LibsqlUserRepository;

  constructor() {
    this.userRepository = new LibsqlUserRepository();
  }

  async register(req: Request): Promise<Response> {
    try {
      const body = await req.json() as any;
      const useCase = new RegisterUseCase(this.userRepository);
      const result = await useCase.execute(body);
      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async login(req: Request): Promise<Response> {
    try {
      const body = await req.json() as any;
      const useCase = new LoginUseCase(this.userRepository);
      const result = await useCase.execute(body);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async handleGoogle(req: Request): Promise<Response> {
    try {
      const body = await req.json() as any;
      const googleProvider = new GoogleOAuthProvider();
      const useCase = new OAuthLoginUseCase(this.userRepository, googleProvider);
      const result = await useCase.execute(body.code);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async handleGitHub(req: Request): Promise<Response> {
    try {
      const body = await req.json() as any;
      const githubProvider = new GitHubOAuthProvider();
      const useCase = new OAuthLoginUseCase(this.userRepository, githubProvider);
      const result = await useCase.execute(body.code);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async me(req: Request, userId: string): Promise<Response> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return new Response(JSON.stringify({ message: "User not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          provider: user.provider,
          avatarUrl: user.avatarUrl,
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  private handleError(error: any): Response {
    const status = error instanceof DomainError ? 400 : 500;
    return new Response(
      JSON.stringify({ message: error.message || "Internal Server Error" }),
      {
        status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
